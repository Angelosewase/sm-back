import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { EmailService } from '../auth/email.service';
import { Role, User } from '../users/schemas/user.schema';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { QueryTeacherDto } from './dto/query-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { FilterQuery, Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Teacher, TeacherDocument } from './schemas/teacher.schema';
import { randomBytes } from 'crypto';
import { SubjectDocument } from 'src/subjects/schemas/subject.schema';
import { Class, ClassDocument } from 'src/classes/schemas/class.schema';
import { Subject } from 'rxjs';

@Injectable()
export class TeachersService {
  private readonly logger = new Logger(TeachersService.name);
  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
   @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>, 
   @InjectModel(Class.name) private classModel: Model<ClassDocument>,
   @InjectModel(Subject.name) private subjectModel: Model<SubjectDocument>,
  ) {}
async create(createTeacherDto: CreateTeacherDto): Promise<Teacher> {
  console.log("the create teacher dto is 1: ", createTeacherDto)

   const temporaryPassword = this.generateTemporaryPassword();
    // Create user first with role TEACHER
    const userDto = {
      email: createTeacherDto.email,
      password: createTeacherDto.password,
      name: createTeacherDto.name,
      phone: createTeacherDto.phone,
      experience: createTeacherDto.experience,
      role: Role.TEACHER,
      school: createTeacherDto.school,
    };
    const user = await this.usersService.createUser(userDto);

    // Create teacher document
    const teacher = new this.teacherModel({
      user: user._id,
      teacherId: createTeacherDto.teacherId,
      subjectsCanTeach: createTeacherDto.subjectsCanTeach?.map(id => new Types.ObjectId(id)),
      assignedClasses: createTeacherDto.assignedClasses?.map(id => new Types.ObjectId(id)),
      phone: createTeacherDto.phone, // Override if needed
      qualification: createTeacherDto.qualification,
      hireDate: createTeacherDto.hireDate,
      school: new Types.ObjectId(createTeacherDto.school),
      status: createTeacherDto.status,
      address: createTeacherDto.address,
      city: createTeacherDto.city,
      state: createTeacherDto.state,
      zip: createTeacherDto.zip,
      emergencyContact: createTeacherDto.emergencyContact,
      notes: createTeacherDto.notes,
    });

    this.sendWelcomeEmailSafely(user, temporaryPassword);

    return teacher.save();
  }

  async findAll(query: QueryTeacherDto) {
        const {
          q,
          email,
          school,
          page = 1,
          limit = 10,
          sortBy = 'createdAt',
          order = 'desc',
        } = query;
    
        const filter: FilterQuery<Teacher> = {};
        if (email) filter.email = email.toLowerCase();
        if (school) filter.school = school;
        if (q) {
          const regex = new RegExp(q, 'i');
          filter.$or = [{ name: regex }, { email: regex }];
        }
    
        const skip = (page - 1) * limit;
        const sort: Record<string, 1 | -1> = { [sortBy]: order === 'asc' ? 1 : -1 };
    
        const [items, total] = await Promise.all([
          this.teacherModel
            .find(filter)
            .populate('user subjectsCanTeach assignedClasses school')
            .select('-password -__v')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec(),
          this.teacherModel.countDocuments(filter).exec(),
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
        } 
  }

  async findOne(id: string): Promise<Teacher> {
    const teacher = await this.teacherModel.findById(id).populate('user subjectsCanTeach assignedClasses school').exec();
    if (!teacher) throw new NotFoundException('Teacher not found');
    return teacher;
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto): Promise<Teacher | null> {
    const teacher = await this.findOne(id);
    // Update user if needed (e.g., phone, experience via usersService)
    if (updateTeacherDto.phone || updateTeacherDto.experience) {
      await this.usersService.update(teacher.user.toString(), {
        phone: updateTeacherDto.phone,
        experience: updateTeacherDto.experience,
      });
    }
    // Update teacher fields
    return this.teacherModel.findByIdAndUpdate(id, {
      ...updateTeacherDto,
      subjectsCanTeach: updateTeacherDto.subjectsCanTeach?.map(id => new Types.ObjectId(id)),
      assignedClasses: updateTeacherDto.assignedClasses?.map(id => new Types.ObjectId(id)),
    }, { new: true }).exec();
  }

  async delete(id: string): Promise<Teacher | null> {
    const teacher = await this.findOne(id);
    await this.usersService.remove(teacher.user.toString()); // Cascade delete user
    return this.teacherModel.findByIdAndDelete(id).exec();
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
        (cls: any) =>
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


  async unassignClasses(teacherId: string, classIds: string[]) {
  const teacherObjectId = new Types.ObjectId(teacherId);

  const session = await this.teacherModel.db.startSession();
  session.startTransaction();

  try {
    // Remove from teacher's assignedClasses
    await this.teacherModel.findByIdAndUpdate(
      teacherObjectId,
      { $pull: { assignedClasses: { $in: classIds.map(id => new Types.ObjectId(id)) } } },
      { session },
    );

    // Remove teacher from those classes
    await this.classModel.updateMany(
      { _id: { $in: classIds.map(id => new Types.ObjectId(id)) } },
      { $set: { classTeacher: null } },
      { session },
    );

    await session.commitTransaction();
    return { message: 'Classes unassigned successfully' };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
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

  private getTeacherObjectId(teacher: any): Types.ObjectId {
    return (teacher)._id instanceof Types.ObjectId
      ? teacher._id
      : new Types.ObjectId((teacher as any)._id);
  }


  /** Assign subjects to a teacher */
  async assignSubjectsToTeacher(teacherId: string, subjectIds: string[]) {
    // Validate teacher exists
    const teacher = await this.teacherModel.findById(teacherId);
    if (!teacher) throw new BadRequestException('Teacher not found');

    // Validate subjects exist
    for (const subjectId of subjectIds) {
      const exists = await this.subjectModel.exists({ _id: subjectId });
      if (!exists) throw new BadRequestException(`Subject ${subjectId} not found`);
    }

    // Add subjects avoiding duplicates
    await this.teacherModel.updateOne(
      { _id: teacherId },
      { $addToSet: { subjectsCanTeach: { $each: subjectIds } } }
    );
    this.logger.log(`Assigned subjects ${subjectIds.join(', ')} to teacher ${teacherId}`);
    return await this.teacherModel.findById(teacherId).populate('subjectsCanTeach');
  }

  /** Remove subject from teacher */
  async removeSubjectFromTeacher(teacherId: string, subjectId: string) {
    const teacher = await this.teacherModel.findById(teacherId);
    if (!teacher) throw new BadRequestException('Teacher not found');
    await this.teacherModel.updateOne(
      { _id: teacherId },
      { $pull: { subjectsCanTeach: subjectId } }
    );
    this.logger.log(`Removed subject ${subjectId} from teacher ${teacherId}`);
    return await this.teacherModel.findById(teacherId).populate('subjectsCanTeach');
  }
}




