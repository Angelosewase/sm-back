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
import { SchoolModuleService } from '../school-module/school-module.service';
import { QuerySubjectDto } from './dto/query-subject.dto';
import { Role, User, UserDocument } from 'src/users/schemas/user.schema';
import { Class, ClassDocument } from 'src/classes/schemas/class.schema';
import { ClassesService } from 'src/classes/classes.service';
import { Teacher, TeacherDocument } from 'src/teachers/schemas/teacher.schema';

interface ResultInterface {
  class?: Class | null;
  subject?: Subject | null;
  teacher?: User | null;
}

interface AssignmentQueryOptions {
  academicYear?: string;
  term?: string;
  populate?: boolean;
}

@Injectable()
export class SubjectService {
  private logger = new Logger(SubjectService.name);
  constructor(
    @InjectModel(Subject.name) private subjectModel: Model<Subject>,
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly usersService: UsersService,
    private readonly schoolService: SchoolModuleService,
    private readonly classService: ClassesService,
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
    this.logger.log(
      `Assigned subjects ${subjectIds.join(', ')} to class ${classId}`,
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
    this.logger.log(`Removed subject ${subjectId} from class ${classId}`);
    return await this.classModel.findById(classId).populate('assignedSubjects');
  }

  /** List subjects assigned to a class */
  async listClassSubjects(classId: string) {
    const classDoc = await this.classModel
      .findById(classId)
      .populate('assignedSubjects');
    if (!classDoc) throw new BadRequestException('Class not found');
    return classDoc.assignedSubjects;
  }

  /**/

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
      delete payload.gradeLevel;
    }

    if (payload.school) {
      const school_ = await this.schoolService.findOne(payload.school);
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

    const s = new this.subjectModel(payload);
    const saved = await s.save();
    const obj = (saved as any).toObject ? (saved as any).toObject() : saved;
    obj.subjectName = obj.name;
    obj.subjectCode = obj.code;
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
    } = query;

    const filter: FilterQuery<Subject> = {};
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
    return this.subjectModel.findByIdAndDelete(id).exec();
  }

  async listTeacherSubjects(teacherId: string, query: QuerySubjectDto) {
    const teacher = await this.teacherModel
      .findById(teacherId)
      .populate('subjectsCanTeach');
    if (!teacher) throw new BadRequestException('Teacher not found');
    return teacher.subjectsCanTeach;
  }
}
