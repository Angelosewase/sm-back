import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { EmailService } from '../auth/email.service';
import { Role, User } from '../users/schemas/user.schema';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { QueryTeacherDto } from './dto/query-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { randomBytes } from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Teacher,
  TeacherDocument,
} from '../school-module/schemas/teacher.schema';
import { Class, ClassDocument } from '../school-module/schemas/class.schema';
import {
  Subject,
  SubjectDocument,
} from '../school-module/schemas/subject.schema';

@Injectable()
export class TeachersService {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    @InjectModel(Teacher.name)
    private readonly teacherModel: Model<TeacherDocument>,
    @InjectModel(Class.name)
    private readonly classModel: Model<ClassDocument>,
    @InjectModel(Subject.name)
    private readonly subjectModel: Model<SubjectDocument>,
  ) {}

  async create(createTeacherDto: CreateTeacherDto) {
    const temporaryPassword = this.generateTemporaryPassword();
    const teacher = await this.usersService.createUser({
      ...createTeacherDto,
      password: temporaryPassword,
      role: Role.TEACHER,
    });

    this.sendWelcomeEmailSafely(teacher, temporaryPassword);

    const teacherObjectId = this.getTeacherObjectId(teacher);

    await this.teacherModel.findOneAndUpdate(
      { user: teacherObjectId },
      { $setOnInsert: this.buildTeacherInsertData(teacher) },
      { upsert: true },
    );

    const teacherData =
      typeof (teacher as any).toObject === 'function'
        ? (teacher as any).toObject()
        : (teacher as any);

    return {
      ...teacherData,
      temporaryPassword,
    };
  }

  async findAll(query: QueryTeacherDto) {
    return this.usersService.findAll({
      ...query,
      role: Role.TEACHER,
    });
  }

  async findOne(id: string) {
    return this.ensureTeacher(id);
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto) {
    await this.ensureTeacher(id);
    const updatePayload: Parameters<
      typeof this.usersService.update
    >[1] = {
      ...updateTeacherDto,
      role: Role.TEACHER,
    };

    return this.usersService.update(id, updatePayload);
  }

  async remove(id: string) {
    const teacher = await this.ensureTeacher(id);
    const teacherObjectId = this.getTeacherObjectId(teacher);
    await this.teacherModel.deleteOne({ user: teacherObjectId });
    return this.usersService.remove(id);
  }

  private async ensureTeacher(id: string): Promise<User> {
    const teacher = await this.usersService.findById(id);
    if (!teacher || teacher.role !== Role.TEACHER) {
      throw new NotFoundException('Teacher not found');
    }
    return teacher;
  }

  private async sendWelcomeEmailSafely(teacher: User, temporaryPassword: string) {
    try {
      await this.emailService.sendTeacherWelcomeEmail(
        teacher.email,
        temporaryPassword,
        (teacher as any)?.name,
      );
    } catch (error) {
      // Non-blocking email failure
      // eslint-disable-next-line no-console
      console.error('Failed to send teacher welcome email', error);
    }
  }

  private generateTemporaryPassword(): string {
    return randomBytes(9)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 12);
  }

  async assignClasses(teacherId: string, classIds: string[]) {
    const teacher = await this.ensureTeacher(teacherId);
    const uniqueClassIds = Array.from(new Set(classIds));
    if (!uniqueClassIds.length) {
      throw new BadRequestException('No class ids provided');
    }

    const classObjectIds = uniqueClassIds.map((id) => {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException(`Invalid class id "${id}"`);
      }
      return new Types.ObjectId(id);
    });

    const classes = await this.classModel
      .find({ _id: { $in: classObjectIds } })
      .select('_id school')
      .lean()
      .exec();

    const foundIds = new Set(classes.map((cls) => cls._id.toString()));
    const missing = uniqueClassIds.filter((id) => !foundIds.has(id));
    if (missing.length) {
      throw new NotFoundException(
        `Classes not found: ${missing.join(', ')}`,
      );
    }

    if (teacher.school) {
      const teacherSchoolId = teacher.school.toString();
      const mismatched = classes.filter(
        (cls) =>
          cls.school && cls.school.toString() !== teacherSchoolId,
      );
      if (mismatched.length) {
        throw new BadRequestException(
          'One or more classes belong to a different school',
        );
      }
    }

    const teacherObjectId = this.getTeacherObjectId(teacher);

    await this.classModel.updateMany(
      { _id: { $in: classObjectIds } },
      { $addToSet: { assignedTeachers: teacherObjectId } },
    );

    const teacherProfile = await this.teacherModel
      .findOneAndUpdate(
        { user: teacherObjectId },
        {
          $setOnInsert: this.buildTeacherInsertData(teacher),
          $addToSet: { assignedClasses: { $each: classObjectIds } },
        },
        { new: true, upsert: true },
      )
      .populate(['assignedClasses', 'subjectsCanTeach'])
      .exec();

    const existingUserClasses = Array.from(
      new Set(
        ([...(teacher as any).assignedClasses ?? []] as any[]).map((value) =>
          value.toString(),
        ),
      ),
    );
    const combinedClassIds = Array.from(
      new Set([...existingUserClasses, ...uniqueClassIds]),
    );

    const updatedUser = await this.usersService.update(
      teacherObjectId.toString(),
      {
        assignedClasses: combinedClassIds,
      } as any,
    );

    return {
      user: updatedUser,
      teacherProfile,
    };
  }

  async assignSubjects(teacherId: string, subjectIds: string[]) {
    const teacher = await this.ensureTeacher(teacherId);
    const uniqueSubjectIds = Array.from(new Set(subjectIds));
    if (!uniqueSubjectIds.length) {
      throw new BadRequestException('No subject ids provided');
    }

    const subjectObjectIds = uniqueSubjectIds.map((id) => {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException(`Invalid subject id "${id}"`);
      }
      return new Types.ObjectId(id);
    });

    const subjects = await this.subjectModel
      .find({ _id: { $in: subjectObjectIds } })
      .select('_id school')
      .lean()
      .exec();

    const foundIds = new Set(subjects.map((subject) => subject._id.toString()));
    const missing = uniqueSubjectIds.filter((id) => !foundIds.has(id));
    if (missing.length) {
      throw new NotFoundException(
        `Subjects not found: ${missing.join(', ')}`,
      );
    }

    if (teacher.school) {
      const teacherSchoolId = teacher.school.toString();
      const mismatched = subjects.filter(
        (subject) =>
          subject.school && subject.school.toString() !== teacherSchoolId,
      );
      if (mismatched.length) {
        throw new BadRequestException(
          'One or more subjects belong to a different school',
        );
      }
    }

    const teacherObjectId = this.getTeacherObjectId(teacher);

    const teacherProfile = await this.teacherModel
      .findOneAndUpdate(
        { user: teacherObjectId },
        {
          $setOnInsert: this.buildTeacherInsertData(teacher),
          $addToSet: { subjectsCanTeach: { $each: subjectObjectIds } },
        },
        { new: true, upsert: true },
      )
      .populate(['assignedClasses', 'subjectsCanTeach'])
      .exec();

    const existingUserSubjects = Array.from(
      new Set(
        ([...(teacher as any).subjectsCanTeach ?? []] as any[]).map((value) =>
          value.toString(),
        ),
      ),
    );
    const combinedSubjectIds = Array.from(
      new Set([...existingUserSubjects, ...uniqueSubjectIds]),
    );

    const updatedUser = await this.usersService.update(
      teacherObjectId.toString(),
      {
        subjectsCanTeach: combinedSubjectIds,
      } as any,
    );

    return {
      user: updatedUser,
      teacherProfile,
    };
  }

  private buildTeacherInsertData(teacher: User) {
    const insert: Record<string, any> = {
      user: this.getTeacherObjectId(teacher),
    };

    const schoolValue = (teacher as any).school;
    if (schoolValue) {
      if (schoolValue instanceof Types.ObjectId) {
        insert.school = schoolValue;
      } else if (typeof schoolValue === 'string') {
        if (Types.ObjectId.isValid(schoolValue)) {
          insert.school = new Types.ObjectId(schoolValue);
        }
      } else if ((schoolValue as any)._id) {
        const schoolIdValue = (schoolValue as any)._id;
        if (schoolIdValue instanceof Types.ObjectId) {
          insert.school = schoolIdValue;
        } else if (
          typeof schoolIdValue === 'string' &&
          Types.ObjectId.isValid(schoolIdValue)
        ) {
          insert.school = new Types.ObjectId(schoolIdValue);
        }
      }
    }

    return insert;
  }

  private getTeacherObjectId(teacher: User): Types.ObjectId {
    return teacher._id instanceof Types.ObjectId
      ? teacher._id
      : new Types.ObjectId((teacher as any)._id);
  }
}


