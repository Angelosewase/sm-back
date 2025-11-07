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
import { Class } from '../schemas/class.schema';
import { ClassService } from './class.service';
// import InjectModel from '@nestjs/mongoose';

function round(n: number) {
  return Math.round((n || 0) * 100) / 100;
}

@Injectable()
export class MarksService {
  constructor(
    @InjectModel(Marks.name) private marksModel: Model<MarksDocument>,
    @InjectModel(Subject.name) private subjectModel: Model<Subject>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<Enrollment>,
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLog>,

    private readonly classService: ClassService,
  ) {}

  async enterMark(actorUser: any, dto: EnterMarkDto) {
    // permission check placeholder: ensure actorUser is teacher of subject/class or admin
    // Load subject to get maxScore
    const subject = await this.subjectModel.findById(dto.subjectId).exec();
    if (!subject) throw new NotFoundException('Subject not found');

    const class_ = await this.classService.getClassById(dto.classId);
    if (!class_)
      throw new BadRequestException(
        'Provided class id "' + dto.classId + '" not found',
      );

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
    _collection: string,
    documentId: string,
    before?: any,
    after?: any,
  ) {
    try {
      const rec = new this.auditModel({
        user: userId,
        action,
        _collection,
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
    const match: any = { class: classId, academicYear };
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

  /**
   * For a given class and academicYear, compute the average score per subject per quarter.
   * Assumes terms are named or encoded so they can be grouped into 1st..4th Quarter.
   * Returns array: [{ subjectId, subjectName, quarterAverages: { q1, q2, q3, q4 } }]
   */
  async getClassSubjectQuarterAverages(classId: string, academicYear: string) {
    // group by subject and term, then pivot
    const match: any = { class: classId, academicYear };

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: { subject: '$subject', term: '$term' },
          avgScore: { $avg: '$score' },
        },
      },
      {
        $group: {
          _id: '$_id.subject',
          terms: {
            $push: { term: '$_id.term', avgScore: '$avgScore' },
          },
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
      {
        $project: {
          _id: 1,
          subjectName: '$subject.name',
          terms: 1,
        },
      },
    ];

    const res = await this.marksModel.aggregate(pipeline).exec();

    // normalize terms into quarters q1..q4. Terms might be 'Term 1', 'Q1', '1st Quarter' etc.
    const normalizeTermToQuarter = (term: string) => {
      if (!term) return null;
      const t = String(term).toLowerCase();
      if (
        t.includes('1') ||
        t.includes('q1') ||
        t.includes('first') ||
        t.includes('1st')
      )
        return 'q1';
      if (
        t.includes('2') ||
        t.includes('q2') ||
        t.includes('second') ||
        t.includes('2nd')
      )
        return 'q2';
      if (
        t.includes('3') ||
        t.includes('q3') ||
        t.includes('third') ||
        t.includes('3rd')
      )
        return 'q3';
      if (
        t.includes('4') ||
        t.includes('q4') ||
        t.includes('fourth') ||
        t.includes('4th')
      )
        return 'q4';
      return null;
    };

    return res.map((r: any) => {
      const quarters: any = { q1: null, q2: null, q3: null, q4: null };
      for (const t of r.terms || []) {
        const q = normalizeTermToQuarter(t.term);
        if (q) quarters[q] = Math.round((t.avgScore || 0) * 100) / 100;
      }
      return {
        subjectId: String(r._id),
        subjectName: r.subjectName || 'Subject',
        quarterAverages: quarters,
      };
    });
  }

  /**
   * Build a per-subject, per-term breakdown for a single student in an academic year.
   * Returns subjects array with per-term CAT/EXAM/TOT and totals/percentage.
   */
  async getStudentAcademicReport(
    studentId: string,
    academicYear: string,
    classId?: string,
  ) {
    const match: any = { student: studentId, academicYear };
    if (classId) match.class = classId;

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: {
            subject: '$subject',
            term: '$term',
            assessment: '$assessmentType',
          },
          totalScore: { $sum: '$score' },
          totalMax: { $sum: '$maxScore' },
        },
      },
      {
        $group: {
          _id: { subject: '$_id.subject', term: '$_id.term' },
          assessments: {
            $push: {
              assessment: '$_id.assessment',
              totalScore: '$totalScore',
              totalMax: '$totalMax',
            },
          },
        },
      },
      {
        $group: {
          _id: '$_id.subject',
          terms: { $push: { term: '$_id.term', assessments: '$assessments' } },
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
      {
        $project: {
          subjectId: '$_id',
          subjectName: '$subject.name',
          terms: 1,
        },
      },
      { $sort: { subjectName: 1 } },
    ];

    const rows = await this.marksModel.aggregate(pipeline as any).exec();

    // Map terms into consistent shape for 1..4 quarters
    const normalizeTerm = (t: string) => {
      if (!t) return null;
      const s = String(t).toLowerCase();
      if (
        s.includes('1') ||
        s.includes('q1') ||
        s.includes('first') ||
        s.includes('1st')
      )
        return 'q1';
      if (
        s.includes('2') ||
        s.includes('q2') ||
        s.includes('second') ||
        s.includes('2nd')
      )
        return 'q2';
      if (
        s.includes('3') ||
        s.includes('q3') ||
        s.includes('third') ||
        s.includes('3rd')
      )
        return 'q3';
      if (
        s.includes('4') ||
        s.includes('q4') ||
        s.includes('fourth') ||
        s.includes('4th')
      )
        return 'q4';
      return null;
    };

    const subjects = [] as any[];
    let overallScore = 0;
    let overallMax = 0;

    for (const r of rows) {
      const termMap: any = {
        q1: { cat: null, exam: null, tot: null },
        q2: { cat: null, exam: null, tot: null },
        q3: { cat: null, exam: null, tot: null },
        q4: { cat: null, exam: null, tot: null },
      };
      let subjectTotal = 0;
      let subjectMax = 0;
      for (const term of r.terms || []) {
        const q = normalizeTerm(term.term) || term.term;
        let cat = 0,
          exam = 0,
          catMax = 0,
          examMax = 0;
        for (const a of term.assessments || []) {
          const tname = String(a.assessment || '').toLowerCase();
          if (tname.includes('cat')) {
            cat += a.totalScore || 0;
            catMax += a.totalMax || 0;
          } else if (tname.includes('exam')) {
            exam += a.totalScore || 0;
            examMax += a.totalMax || 0;
          } else {
            // unknown assessment type: accumulate into tot
            cat += a.totalScore || 0;
            catMax += a.totalMax || 0;
          }
        }
        const tot = (cat || 0) + (exam || 0);
        const totMax = (catMax || 0) + (examMax || 0);
        termMap[q] = {
          cat: round(cat),
          exam: round(exam),
          tot: round(tot),
          max: round(totMax),
        };
        subjectTotal += tot;
        subjectMax += totMax;
      }

      overallScore += subjectTotal;
      overallMax += subjectMax;

      subjects.push({
        subjectId: String(r.subjectId || r._id),
        subjectName: await this.getSubjectName(r.subjectId)|| 'Subject',
        terms: termMap,
        total: round(subjectTotal),
        max: round(subjectMax),
        percentage: subjectMax
          ? round((subjectTotal / subjectMax) * 100)
          : null,
      });
    }

    const overallPercentage = overallMax
      ? round((overallScore / overallMax) * 100)
      : null;

    return {
      student: studentId,
      academicYear,
      classId,
      subjects,
      overall: {
        total: round(overallScore),
        max: round(overallMax),
        percentage: overallPercentage,
      },
    };
  }


  async getSubjectName(subjectId: string):Promise<string | undefined> {
    let subject =  await this.subjectModel.findOne({ _id: subjectId }).exec();
     return subject?.name;
  }

  async getAllMarksRecords() {
    return this.marksModel.find().exec();
  }
}
