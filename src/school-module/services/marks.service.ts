import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { Marks, MarksDocument } from '../schemas/marks.schema';
import { EnterMarkDto } from '../dto/enter-mark.dto';
import { Subject } from '../schemas/subject.schema';
import { Enrollment } from '../schemas/enrollment.schema';
import { AuditLog } from '../schemas/audit.schema';
import { InjectModel } from '@nestjs/mongoose';
// import InjectModel from '@nestjs/mongoose';

@Injectable()
export class MarksService {
  constructor(
    @InjectModel(Marks.name) private marksModel: Model<MarksDocument>,
    @InjectModel(Subject.name) private subjectModel: Model<Subject>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<Enrollment>,
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLog>,
  ) {}

  async enterMark(actorUser: any, dto: EnterMarkDto) {
    // permission check placeholder: ensure actorUser is teacher of subject/class or admin
    // Load subject to get maxScore
    const subject = await this.subjectModel.findById(dto.subjectId).exec();
    if (!subject) throw new NotFoundException('Subject not found');

    const max = subject.maxScore ?? 100;
    if (dto.score < 0 || dto.score > max) {
      throw new BadRequestException(`score must be between 0 and ${max}`);
    }

    // ensure student is enrolled in the class for academicYear
    const enrolled = await this.enrollmentModel
      .findOne({
        student: dto.studentId,
        class: dto.classId,
        academicYear: dto.academicYear,
        status: 'enrolled',
      })
      .exec();
    if (!enrolled) {
      throw new BadRequestException(
        'Student is not enrolled in class for the given academic year',
      );
    }

    const mark = new this.marksModel({
      student: dto.studentId,
      subject: dto.subjectId,
      class: dto.classId,
      academicYear: dto.academicYear,
      term: dto.term,
      assessmentType: dto.assessmentType,
      score: dto.score,
      maxScore: max,
      comment: dto.comment,
      createdBy: actorUser?.id,
      updatedBy: actorUser?.id,
    });
    return mark.save();
  }

  private async writeAudit(
    userId: any,
    action: string,
    collection: string,
    documentId: string,
    before?: any,
    after?: any,
  ) {
    try {
      const rec = new this.auditModel({
        user: userId,
        action,
        collection,
        documentId,
        before,
        after,
      });
      await rec.save();
    } catch (e) {
      // non-fatal; audit failures shouldn't block the main flow
      // could log to a monitoring system
    }
  }

  async submitMarks(
    teacherUser: any,
    classId: string,
    subjectId: string,
    academicYear: string,
    term?: string,
  ) {
    // teachers can submit marks for their class/subject; admin can submit for any
    const filter: any = {
      class: classId,
      subject: subjectId,
      academicYear,
      status: 'draft',
    };
    if (term) filter.term = term;
    const res = await this.marksModel
      .updateMany(filter, {
        $set: { status: 'submitted', updatedBy: teacherUser?.id },
      })
      .exec();
    await this.writeAudit(
      teacherUser?.id,
      'submitMarks',
      'marks',
      `${classId}:${subjectId}:${academicYear}:${term}`,
      null,
      { matched: res.matchedCount, modified: res.modifiedCount },
    );
    return res;
  }

  async approveMarks(
    adminUser: any,
    classId: string,
    subjectId: string,
    academicYear: string,
    term?: string,
  ) {
    // only admin should call this in controllers (guarded)
    const filter: any = {
      class: classId,
      subject: subjectId,
      academicYear,
      status: 'submitted',
    };
    if (term) filter.term = term;
    const before = await this.marksModel.find(filter).lean().exec();
    const res = await this.marksModel
      .updateMany(filter, {
        $set: { status: 'locked', updatedBy: adminUser?.id },
      })
      .exec();
    const after = await this.marksModel
      .find({ class: classId, subject: subjectId, academicYear, term })
      .lean()
      .exec();
    await this.writeAudit(
      adminUser?.id,
      'approveMarks',
      'marks',
      `${classId}:${subjectId}:${academicYear}:${term}`,
      before,
      after,
    );
    return res;
  }

  async updateMark(
    user: any,
    markId: string,
    patch: { score?: number; comment?: string },
  ) {
    const m = await this.marksModel.findById(markId).exec();
    if (!m) throw new NotFoundException('Mark not found');
    // only allow edit if status is draft or submitted by teacher and user is owner or admin
    if (m.status === 'locked')
      throw new ForbiddenException('Mark is locked and cannot be edited');
    if (patch.score !== undefined) {
      if (patch.score < 0 || patch.score > (m.maxScore ?? 100))
        throw new BadRequestException('score out of range');
      m.score = patch.score;
    }
    if (patch.comment !== undefined) m.comment = patch.comment;
    m.updatedBy = user?.id;
    await m.save();
    await this.writeAudit(
      user?.id,
      'updateMark',
      'marks',
      markId,
      null,
      m.toObject(),
    );
    return m;
  }

  async getSubjectAggregatedMarks(
    classId: string,
    subjectId: string,
    academicYear: string,
    term?: string,
  ) {
    const match: any = {
      class: new Types.ObjectId(classId),
      subject: new Types.ObjectId(subjectId),
      academicYear,
    };
    if (term) match.term = term;

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$student',
          avgScore: { $avg: '$score' },
          maxScore: { $max: '$score' },
          minScore: { $min: '$score' },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          average: { $avg: '$avgScore' },
          highest: { $max: '$maxScore' },
          lowest: { $min: '$minScore' },
          candidates: { $sum: '$count' },
        },
      },
    ];

    const res = await this.marksModel.aggregate(pipeline).exec();
    return res[0] || { average: 0, highest: 0, lowest: 0, candidates: 0 };
  }

  async getClassPerformance(
    classId: string,
    academicYear: string,
    term?: string,
    topN = 10,
  ) {
    // For each subject in class compute averages and pass rates
    const match: any = { class: new Types.ObjectId(classId), academicYear };
    if (term) match.term = term;

    const subjectStats = await this.marksModel
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: '$subject',
            average: { $avg: '$score' },
            highest: { $max: '$score' },
            lowest: { $min: '$score' },
            attempts: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'subjects',
            localField: '_id',
            foreignField: '_id',
            as: 'subject',
          },
        },
        { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
      ])
      .exec();

    // compute top students
    const studentAverages = await this.marksModel
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: '$student',
            avgScore: { $avg: '$score' },
          },
        },
        { $sort: { avgScore: -1 } },
        { $limit: topN },
        {
          $lookup: {
            from: 'students',
            localField: '_id',
            foreignField: '_id',
            as: 'student',
          },
        },
        { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
      ])
      .exec();

    return { subjectStats, topStudents: studentAverages };
  }
}
