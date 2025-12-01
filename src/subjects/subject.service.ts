import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Subject } from './schemas/subject.schema';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { UsersService } from 'src/users/users.service';
import { QuerySubjectDto } from './dto/query-subject.dto';
import { Role, User, UserDocument } from 'src/users/schemas/user.schema';
import { Class, ClassDocument } from 'src/classes/schemas/class.schema';
import { ClassesService } from 'src/classes/classes.service';
import { Teacher, TeacherDocument } from 'src/teachers/schemas/teacher.schema';
import { SchoolService } from 'src/school/school.service';
import { Marks, MarksDocument } from 'src/marks/schemas/marks.schema';
import {
  Assessment,
  AssessmentDocument,
  AssessmentStatus,
} from 'src/assessments/schemas/assessment-schema';
import { School } from 'src/school/entities/school.entity';
import { EventsService } from 'src/events/events.service';
import { EventTypeI } from 'src/events/schemas/event.schema';

interface ResultInterface {
  class?: Class | null;
  subject?: Subject | null;
  teacher?: User | null;
}

@Injectable()
export class SubjectService {
  private logger = new Logger(SubjectService.name);
  constructor(
    @InjectModel(Subject.name) private subjectModel: Model<Subject>,
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Marks.name) private marksModel: Model<MarksDocument>,
    @InjectModel(Assessment.name)
    private assessmentModel: Model<AssessmentDocument>,
    private readonly usersService: UsersService,
    private readonly schoolService: SchoolService,
    private readonly classService: ClassesService,
    private readonly eventsService: EventsService
  ) {}

  async assignSubjectsToClass(classId: string, subjectIds: string[]) {
    // Validate class exists
    const classDoc = await this.classModel.findById(classId);
    if (!classDoc) throw new BadRequestException('Class not found');

    // Validate each subject exists
    for (const subjectId of subjectIds) {
      const subjectExists = await this.subjectModel.exists({ _id: subjectId });
      if (!subjectExists) {
        throw new BadRequestException(`Subject ${subjectId} not found`);
      }
    }

    // Add subjects without duplicates
    await this.classModel.updateOne(
      { _id: classId },
      { $addToSet: { assignedSubjects: { $each: subjectIds } } },
    );
    
          const event = 'Subjects Assigned';
    
          const details = `Subjects assigned to class ${classDoc.name}`;
          // const user = (student_ as any).createdBy;
          const resourceType = 'Subject';
          const resourceId = classId;
         
          await this.eventsService.logEvent(
            EventTypeI.ASSIGN,
            details,
            resourceType,
            resourceId,
          );
    
    return await this.classModel.findById(classId).populate('assignedSubjects');
  }

  async removeSubjectFromClass(classId: string, subjectId: string) {
    const classDoc = await this.classModel.findById(classId);
    if (!classDoc) throw new BadRequestException('Class not found');
    await this.classModel.updateOne(
      { _id: classId },
      { $pull: { assignedSubjects: subjectId } },
    );

        const event = 'Subjects Assigned';
    
          const details = `Subjects Removed From class ${classDoc.name}`;
          // const user = (student_ as any).createdBy;
          const resourceType = 'Subject';
          const resourceId = classId;
         
          await this.eventsService.logEvent(
            EventTypeI.UNASSIGN,
            details,
            resourceType,
            resourceId,
          );
   
    return await this.classModel.findById(classId).populate('assignedSubjects');
  }

  /** List subjects assigned to a class */


  async listClassSubjects(classId: string, teacherId?: string) {
    // Step 1: Get the class and its subjects
    const classDoc = await this.classModel
      .findById(classId)
      .populate('assignedSubjects')
      .lean();

    if (!classDoc) throw new BadRequestException('Class not found');
    if(!classDoc.assignedSubjects) return [];

    let filteredAssignedSubjects: any[] = classDoc.assignedSubjects as any[];

    // If teacherId provided and teacher is NOT the class teacher, filter by teacher's subjectsCanTeach
    if (teacherId) {
      const teacher = await this.teacherModel.findById(teacherId).lean();
      if (!teacher) throw new BadRequestException('Teacher not found');

      const isClassTeacher =
        classDoc.classTeacher &&
        classDoc.classTeacher.toString() === teacherId.toString();

      if (!isClassTeacher) {
        const teacherSubjectIds = (teacher.subjectsCanTeach || []).map((id: any) => id.toString());
        filteredAssignedSubjects = filteredAssignedSubjects.filter((sub: any) =>
          teacherSubjectIds.includes(sub._id.toString())
        );
      }
    }

    const assignedSubjectIds = filteredAssignedSubjects.map((sub: any) => sub._id);

    // Step 2: Get assessments for class and its subjects
    const assessments = await this.assessmentModel
      .find({ class: classId, subject: { $in: assignedSubjectIds } })
      .lean();

    const marks = await this.marksModel
      .find({ class: classId, subject: { $in: assignedSubjectIds } })
      .lean();

    // Step 3: Map subjects to stats
    return filteredAssignedSubjects.map((subject: any) => {
      // Assessments for this subject/class
      const subjectAssessments = assessments.filter(a => a.subject.toString() === subject._id.toString());
      const doneAssessments = subjectAssessments.filter(a => a.status === AssessmentStatus.COMPLETED);
      const totalAssessments = subjectAssessments.length;

      // Marks for this subject/class
      const subjectMarks = marks.filter(m => m.subject.toString() === subject._id.toString());

      let averageMark: number | null = null;
      let latestMarkDate: Date | null = null;
      if (subjectMarks.length) {
        const totalScores = subjectMarks.reduce((acc, m) => acc + m.score, 0);
        averageMark = +(totalScores / subjectMarks.length).toFixed(2);

        // Get latest mark date
        latestMarkDate = subjectMarks
          .map((m) => (m as any).updatedAt ? (m as any).updatedAt : (m as any).createdAt)
          .sort()
          .reverse()[0];
      }

      return {
        ...subject,
        assessmentsDone: doneAssessments.length,
        totalAssessments,
        averageMark,
        latestMarkDate,
      };
    });
  }
  
  async assignSubjectsToTeacher(teacherId: string, subjectIds: string[]) {
    // Validate teacher exists
    const teacher = await this.teacherModel.findById(teacherId);
    if (!teacher) throw new BadRequestException('Teacher not found');

    // Validate subjects exist
    for (const subjectId of subjectIds) {
      const exists = await this.subjectModel.exists({ _id: subjectId });
      if (!exists)
        throw new BadRequestException(`Subject ${subjectId} not found`);
    }

    // Add subjects avoiding duplicates
    await this.teacherModel.updateOne(
      { _id: teacherId },
      { $addToSet: { subjectsCanTeach: { $each: subjectIds } } },
    );
    this.logger.log(
      `Assigned subjects ${subjectIds.join(', ')} to teacher ${teacherId}`,
    );
    return await this.teacherModel
      .findById(teacherId)
      .populate('subjectsCanTeach');
  }

  /** List classes assigned a subject */
  async getClassesForSubject(subjectId: string) {
    return await this.classModel.find({ assignedSubjects: subjectId });
  }

  async ValidateParams({
    subjectId,
    classId,
    teacherId,
  }: {
    subjectId: string;
    classId?: string;
    teacherId?: string;
  }): Promise<ResultInterface> {
    const result: ResultInterface = {};

    const subject_ = await this.getSubjectById(subjectId);
    if (!subject_) {
      throw new NotFoundException(`Subject with id "${subjectId}" not found`);
    }
    result.subject = subject_;

    if (classId) {
      const class_ = await this.classService.findOne(classId);
      if (!class_) {
        throw new NotFoundException(`Class with id "${classId}" not found`);
      }
      result.class = class_;
    }

    if (teacherId) {
      const teacher_ = await this.usersService.findById(teacherId);
      if (!teacher_) {
        throw new NotFoundException(`Teacher with id "${teacherId}" not found`);
      }
      if (teacher_.role !== 'teacher') {
        throw new BadRequestException(
          `User with id "${teacherId}" is not a teacher`,
        );
      }
      result.teacher = teacher_;
    }

    return result;
  }

  async createSubject(dto: CreateSubjectDto) {
    const payload: any = { ...dto };
    if ((dto as any).subjectName) {
      payload.name = (dto as any).subjectName;
      delete payload.subjectName;
    }
    if ((dto as any).subjectCode) {
      payload.code = (dto as any).subjectCode;
      delete payload.subjectCode;
    }
    if ((dto as any).category) {
      payload.subjectType = (dto as any).category;
      delete payload.category;
    }
    if ((dto as any).gradeLevel && !(dto as any).gradeLevels) {
      payload.gradeLevels = [(dto as any).gradeLevel];
    }

    let school_:any | null = null;
    if (payload.school) {
      school_ = await this.schoolService.findOne(payload.school);
      if (!school_)
        throw new NotFoundException(
          `School with id "${payload.school}" not found`,
        );
    }

    if (payload.code) {
      const subjectWithcode_ = await this.subjectModel
        .findOne({ code: payload.code })
        .exec();
      if (subjectWithcode_)
        throw new BadRequestException(
          `Subject with code "${payload.code}" already exists`,
        );
    }

    const s = new this.subjectModel({
      ...payload,
      school: payload.school ? school_._id : null,
    });
    const saved = await s.save();
    const obj = (saved as any).toObject ? (saved as any).toObject() : saved;
    obj.subjectName = obj.name;
    obj.subjectCode = obj.code;


          const details = `Subjects Created ${obj.name}`;
          // const user = (student_ as any).createdBy;
          const resourceType = 'Subject';
          const resourceId = obj._id;
         
          await this.eventsService.logEvent(
            EventTypeI.CREATE,
            details,
            resourceType,
            resourceId,
          );
    return obj;
  }

  async listSubjects(filter: any = {}) {
    return this.subjectModel.find(filter).exec();
  }

  async findAll(query: QuerySubjectDto) {
    const {
      q,
      subjectType,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc',
      gradeLevel,
      includeTrashed,
      onlyTrashed,
    } = query;

    const filter: FilterQuery<Subject> = {};
    // support soft-delete filters: includeTrashed and onlyTrashed passed via query
    if (onlyTrashed) {
      filter.isTrashed = true;
    } else if (!includeTrashed) {
      console.log("including nto trashed")
      filter.isTrashed = false;
    }
    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { name: regex },
        { location: regex },
        { address: regex },
        { contactEmail: regex },
        { subjectType: regex },
      ];
    }
    if (subjectType) {
      filter.subjectType = subjectType;
    } else if (gradeLevel) {
      filter.gradeLevels = gradeLevel;
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: order === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.subjectModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.subjectModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  getSubjectById(id: string) {
    return this.subjectModel.findById(id).exec();
  }

  async updateSubject(id: string, dto: UpdateSubjectDto) {
    try {
      const subject_ = await this.subjectModel.findById(id).exec();
      if (!subject_)
        throw new NotFoundException(`Subject with id "${id}" not found`);

      const payload: any = { ...dto };
      if ((dto as any).category) {
        payload.subjectType = (dto as any).category;
        delete payload.category;
      }
      if ((dto as any).gradeLevel && !(dto as any).gradeLevels) {

        payload.gradeLevels = [(dto as any).gradeLevel];
        delete payload.gradeLevel;
      }

      if (payload.school) {
        const school_ = await this.schoolService.findOne(payload.school);
        if (!school_)
          throw new NotFoundException(
            `School with id "${payload.school}" not found`,
          );
      }

      const updated = await this.subjectModel
        .findByIdAndUpdate(id, payload, { new: true })
        .exec();
      const obj = (updated as any)?.toObject
        ? (updated as any).toObject()
        : updated;
      if (obj) {
        obj.subjectName = obj.name;
        obj.subjectCode = obj.code;
      }
      return obj;
    } catch (error) {
      throw error;
    }
  }

  async findSubjectByCode(code?: string): Promise<Subject> {
    const _sub = await this.subjectModel.findOne({ code }).exec();
    if (_sub) return _sub;
    throw new NotFoundException(`Subject with code "${code}" not found`);
  }

  async deleteSubject(id: string) {
    // Soft-delete (trash) the subject
    const subject = await this.subjectModel.findById(id).exec();
    if (!subject)
      throw new NotFoundException(`Subject with id "${id}" not found`);
    if ((subject as any).isTrashed)
      throw new BadRequestException('Subject is already trashed');
    (subject as any).isTrashed = true;
    (subject as any).trashedAt = new Date();
    await subject.save();
    return { success: true };
  }

  async restore(id: string) {
    const subject = await this.subjectModel.findById(id).exec();
    if (!subject)
      throw new NotFoundException(`Subject with id "${id}" not found`);
    if (!(subject as any).isTrashed)
      throw new BadRequestException('Subject is not trashed');
    (subject as any).isTrashed = false;
    (subject as any).trashedAt = null;
    await subject.save();
    return this.subjectModel.findById(id).exec();
  }

  async removePermanently(id: string): Promise<void> {
    const subject = await this.subjectModel.findById(id).exec();
    if (!subject)
      throw new NotFoundException(`Subject with id "${id}" not found`);
    if (!(subject as any).isTrashed)
      throw new BadRequestException(
        'Subject must be trashed before permanent deletion',
      );
    await this.subjectModel.deleteOne({ _id: id }).exec();
  }

  async bulkTrash(ids: string[]): Promise<{ modifiedCount: number }> {
    const objectIds = this.mapToObjectIds(ids);
    const trashedAt = new Date();

    const result = await this.subjectModel
      .updateMany(
        { _id: { $in: objectIds }, isTrashed: false },
        { $set: { isTrashed: true, trashedAt } },
      )
      .exec();

    return { modifiedCount: this.extractModifiedCount(result) };
  }

  async bulkRestore(ids: string[]): Promise<{ modifiedCount: number }> {
    const objectIds = this.mapToObjectIds(ids);

    const result = await this.subjectModel
      .updateMany(
        { _id: { $in: objectIds }, isTrashed: true },
        { $set: { isTrashed: false, trashedAt: null } },
      )
      .exec();

    return { modifiedCount: this.extractModifiedCount(result) };
  }

  async bulkRemovePermanently(
    ids: string[],
  ): Promise<{ deletedCount: number }> {
    const objectIds = this.mapToObjectIds(ids);
    const result = await this.subjectModel
      .deleteMany({ _id: { $in: objectIds }, isTrashed: true })
      .exec();
    return { deletedCount: this.extractDeletedCount(result) };
  }

  private mapToObjectIds(ids: string[]): Types.ObjectId[] {
    return ids.map((id) => new Types.ObjectId(id));
  }

  private extractModifiedCount(result: any): number {
    return result?.modifiedCount ?? result?.nModified ?? result?.n ?? 0;
  }

  private extractDeletedCount(result: any): number {
    return result?.deletedCount ?? result?.n ?? 0;
  }

  async listTeacherSubjects(teacherId: string, query: QuerySubjectDto) {
    const teacher = await this.teacherModel
      .findById(teacherId)
      .populate('subjectsCanTeach');
    if (!teacher) throw new BadRequestException('Teacher not found');
    return teacher.subjectsCanTeach;
  }

  async getSubjectStats(subjectId: string, classId?: string, term?: string) {
    // Filter by subject, optionally by class/term
    const assessmentFilter: any = { subject: subjectId };
    if (classId) assessmentFilter.class = classId;
    if (term) assessmentFilter.term = term;

    // 1. Assessments for this subject
    const assessments = await this.assessmentModel
      .find(assessmentFilter)
      .lean();

    const totalAssessments = assessments.length;
    const completedAssessments = assessments.filter((a) =>
      ['active', 'published'].includes(a.status),
    ).length;
    const totalWeight = assessments.reduce(
      (sum, a) => sum + (a.weight ?? 0),
      0,
    );

    // 2. All marks for assessments in this subject/class/term
    const assessmentIds = assessments.map((a) => a._id);
    const marks = await this.marksModel
      .find({ assessment: { $in: assessmentIds } })
      .lean();

    const averageScore = marks.length
      ? +(marks.reduce((sum, m) => sum + m.score, 0) / marks.length).toFixed(2)
      : null;

    const latestMarkDate = marks.length
      ? marks
          .map((m) =>
            (m as any).updatedAt ? (m as any).updatedAt : (m as any).createdAt,
          )
          .sort()
          .reverse()[0]
      : null;

    // 3. Completion Rate
    const completionRate =
      totalAssessments === 0
        ? 0
        : Math.round((completedAssessments / totalAssessments) * 100);

    return {
      totalAssessments,
      completedAssessments,
      totalWeight, // as percent or fraction
      averageScore,
      completionRate, // in percent
      latestMarkDate,
    };
  }

  async getSubjectAssessments(
    subjectId: string,
    classId?: string,
    term?: string,
  ) {
    const filter: any = { subject: subjectId };
    if (classId) filter.class = classId;
    if (term) filter.term = term;

    // Fetch assessments for this subject/class/term
    const assessments = await this.assessmentModel
      .find(filter)
      .populate('class', 'name') // optionally
      .lean();

    // For completion/submission stats
    // Fetch marks per assessment, calculate completion rates per assessment
    // Assume studentCount can be obtained from Class
    let studentCountPerAssessment: Record<string, number> = {};
    if (classId && assessments.length) {
      // Get student count for this class
      const classDoc = await this.classModel.findById(classId).lean();
      if (classDoc) {
        assessments.forEach(
          (a) =>
            (studentCountPerAssessment[(a as any)._id] =
              classDoc.studentCount || 0),
        );
      }
    }

    // Fetch all marks for the assessments
    const assessmentIds = assessments.map((a) => a._id);
    const marks = await this.marksModel
      .find({ assessment: { $in: assessmentIds } })
      .lean();

    // Make a lookup for marks per assessment
    const marksByAssessment: Record<string, any[]> = {};
    for (const m of marks) {
      const id = m.assessment?.toString();
      if (!marksByAssessment[id]) marksByAssessment[id] = [];
      marksByAssessment[id].push(m);
    }

    // Build summary for each assessment
    return assessments.map((a) => {
      const marksForThis = marksByAssessment[a._id.toString()] || [];
      const totalScore = marksForThis.reduce((sum, m) => sum + m.score, 0);
      const averageScore = marksForThis.length
        ? +(totalScore / marksForThis.length).toFixed(2)
        : null;
      const max = a.maxScore ?? 100;
      const submissionRate = studentCountPerAssessment[a._id.toString()]
        ? Math.round(
            (marksForThis.length /
              studentCountPerAssessment[a._id.toString()]) *
              100,
          )
        : null;

      return {
        assessmentId: a._id,
        title: a.title,
        assessmentType: a.AssessmentType,
        weight: a.weight ?? 0,
        createdAt: (a as any).createdAt,
        maxScore: max,
        class: a.class ?? null,
        completedCount: marksForThis.length,
        totalCount: studentCountPerAssessment[a._id.toString()] || null,
        completionRate: submissionRate,
        averageScore: averageScore,
        status: a.status,
        // You can add more such as: description, term, etc
      };
    });
  }
}
