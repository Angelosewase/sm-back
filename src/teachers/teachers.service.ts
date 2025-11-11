import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
import {
  Subject as SubjectEntity,
  SubjectDocument,
} from 'src/subjects/schemas/subject.schema';
import { Class, ClassDocument } from 'src/classes/schemas/class.schema';
import {
  SubjectAssignment,
  SubjectAssignmentDocument,
} from 'src/subjects/schemas/subject-assignment.schema';

@Injectable()
export class TeachersService {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
   @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>, 
   @InjectModel(Class.name) private classModel: Model<ClassDocument>,
   @InjectModel(SubjectEntity.name) private subjectModel: Model<SubjectDocument>,
   @InjectModel(SubjectAssignment.name)
    private readonly subjectAssignmentModel: Model<SubjectAssignmentDocument>,
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
      department: createTeacherDto.department,
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
      status,
      department,
      subjectId,
      classId,
      includeTrashed,
      onlyTrashed,
    } = query;

    const paginationLimit = Math.min(limit ?? 10, 100);
    const skip = (page - 1) * paginationLimit;
    const sort: Record<string, 1 | -1> = {
      [sortBy]: order === 'asc' ? 1 : -1,
    };

    const filter: FilterQuery<TeacherDocument> = {};

    if (onlyTrashed) {
      filter.isTrashed = true;
    } else if (!includeTrashed) {
      filter.isTrashed = false;
    }

    if (school) {
      filter.school = this.toObjectId(school, 'school');
    }

    if (status) {
      filter.status = status;
    }

    if (department) {
      filter.department = department;
    }

    if (subjectId) {
      filter.subjectsCanTeach = this.toObjectId(subjectId, 'subjectId');
    }

    if (classId) {
      filter.assignedClasses = this.toObjectId(classId, 'classId');
    }

    if (q || email) {
      const usersResult = await this.usersService.findAll({
        q,
        email,
        role: Role.TEACHER,
        limit: 1000,
        page: 1,
      } as any);

      const userIds = usersResult.items
        .map((user: any) => user?._id?.toString())
        .filter(Boolean);

      if (!userIds.length) {
        return {
          items: [],
          total: 0,
          page,
          limit: paginationLimit,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        };
      }

      filter.user = {
        $in: userIds.map((id) => new Types.ObjectId(id)),
      };
    }

    const [items, total] = await Promise.all([
      this.teacherModel
        .find(filter)
        .populate('user subjectsCanTeach assignedClasses school')
        .select('-__v')
        .sort(sort)
        .skip(skip)
        .limit(paginationLimit)
        .exec(),
      this.teacherModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / paginationLimit) || 1;

    return {
      items,
      total,
      page,
      limit: paginationLimit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findOne(id: string): Promise<Teacher> {
    const teacher = await this.teacherModel.findById(id).populate('user subjectsCanTeach assignedClasses school').exec();
    if (!teacher) throw new NotFoundException('Teacher not found');
    return teacher;
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto): Promise<Teacher | null> {
    const teacher = await this.findOne(id);
    if ((teacher as any).isTrashed) {
      throw new BadRequestException('Cannot update a teacher that is in the trash');
    }
    // Update user if needed (e.g., phone, experience via usersService)
    if (updateTeacherDto.phone || updateTeacherDto.experience) {
      const userRef = teacher.user as any;
      const userId =
        userRef instanceof Types.ObjectId
          ? userRef.toString()
          : userRef?._id?.toString();

      if (!userId) {
        throw new BadRequestException('Unable to determine teacher user id');
      }

      await this.usersService.update(userId, {
        phone: updateTeacherDto.phone,
        experience: updateTeacherDto.experience,
      });
    }
    // Update teacher fields
    return this.teacherModel.findByIdAndUpdate(id, {
      ...updateTeacherDto,
      subjectsCanTeach: updateTeacherDto.subjectsCanTeach?.map(id => new Types.ObjectId(id)),
      assignedClasses: updateTeacherDto.assignedClasses?.map(id => new Types.ObjectId(id)),
      department: updateTeacherDto.department,
    }, { new: true }).exec();
  }

  async delete(id: string) {
    const teacher = await this.teacherModel.findById(id).exec();

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (teacher.isTrashed) {
      throw new BadRequestException('Teacher is already in the trash');
    }

    teacher.isTrashed = true;
    teacher.trashedAt = new Date();
    await teacher.save();

    await this.subjectAssignmentModel
      .updateMany({ teacher: teacher.user }, { $unset: { teacher: 1 } })
      .exec();

    await this.classModel
      .updateMany(
        { classTeacher: teacher.user },
        { $set: { classTeacher: null } },
      )
      .exec();

    return {
      message: 'Teacher moved to trash',
      teacher: await this.teacherModel
        .findById(id)
        .populate('user subjectsCanTeach assignedClasses school')
        .exec(),
    };
  }

  async restore(id: string) {
    const teacher = await this.teacherModel.findById(id).exec();

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (!teacher.isTrashed) {
      throw new BadRequestException('Teacher is not in the trash');
    }

    teacher.isTrashed = false;
    teacher.trashedAt = null;
    await teacher.save();

    return this.teacherModel
      .findById(id)
      .populate('user subjectsCanTeach assignedClasses school')
      .exec();
  }

  async removePermanently(id: string) {
    const teacher = await this.teacherModel.findById(id).exec();

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (!teacher.isTrashed) {
      throw new BadRequestException(
        'Teacher must be moved to trash before permanent deletion',
      );
    }

    const userObjectId = teacher.user;

    await this.subjectAssignmentModel
      .deleteMany({ teacher: userObjectId })
      .exec();

    await this.classModel
      .updateMany({ classTeacher: userObjectId }, { $set: { classTeacher: null } })
      .exec();

    await this.teacherModel.deleteOne({ _id: id }).exec();
    await this.usersService.remove(userObjectId.toString());

    return { message: 'Teacher removed permanently' };
  }

  async bulkTrash(ids: string[]) {
    const objectIds = this.mapToObjectIds(ids);
    if (!objectIds.length) {
      return { modifiedCount: 0 };
    }

    const teachers = await this.teacherModel
      .find({ _id: { $in: objectIds }, isTrashed: false })
      .select('_id user')
      .lean()
      .exec();

    const userIds = teachers
      .map((teacher) => teacher.user?.toString())
      .filter(Boolean);

    if (userIds.length) {
      const userObjectIds = userIds.map((id) => new Types.ObjectId(id));

      await this.subjectAssignmentModel
        .updateMany(
          { teacher: { $in: userObjectIds } },
          { $unset: { teacher: 1 } },
        )
        .exec();

      await this.classModel
        .updateMany(
          { classTeacher: { $in: userObjectIds } },
          { $set: { classTeacher: null } },
        )
        .exec();
    }

    const trashedAt = new Date();
    const result = await this.teacherModel
      .updateMany(
        { _id: { $in: objectIds }, isTrashed: false },
        { $set: { isTrashed: true, trashedAt } },
      )
      .exec();

    return { modifiedCount: this.extractModifiedCount(result) };
  }

  async bulkRestore(ids: string[]) {
    const objectIds = this.mapToObjectIds(ids);
    if (!objectIds.length) {
      return { modifiedCount: 0 };
    }

    const result = await this.teacherModel
      .updateMany(
        { _id: { $in: objectIds }, isTrashed: true },
        { $set: { isTrashed: false, trashedAt: null } },
      )
      .exec();

    return { modifiedCount: this.extractModifiedCount(result) };
  }

  async bulkRemovePermanently(ids: string[]) {
    const objectIds = this.mapToObjectIds(ids);
    if (!objectIds.length) {
      return { deletedCount: 0 };
    }

    const teachers = await this.teacherModel
      .find({ _id: { $in: objectIds }, isTrashed: true })
      .select('_id user')
      .lean()
      .exec();

    if (!teachers.length) {
      return { deletedCount: 0 };
    }

    const userIds = teachers
      .map((teacher) => teacher.user?.toString())
      .filter(Boolean);
    const userObjectIds = userIds.map((id) => new Types.ObjectId(id));

    const deleteResult = await this.teacherModel
      .deleteMany({ _id: { $in: objectIds }, isTrashed: true })
      .exec();

    await Promise.all(
      userIds.map((userId) => this.usersService.remove(userId)),
    );

    if (userObjectIds.length) {
      await this.subjectAssignmentModel
        .deleteMany({ teacher: { $in: userObjectIds } })
        .exec();

      await this.classModel
        .updateMany(
          { classTeacher: { $in: userObjectIds } },
          { $set: { classTeacher: null } },
        )
        .exec();
    }

    return { deletedCount: this.extractDeletedCount(deleteResult) };
  }


  private async ensureTeacher(
    id: string,
  ): Promise<{ user: User; teacher: TeacherDocument | null }> {
    let teacherDocument: (TeacherDocument & { user: any }) | null = null;

    if (Types.ObjectId.isValid(id)) {
      teacherDocument = await this.teacherModel
        .findById(id)
        .populate('user')
        .exec();

      if (!teacherDocument) {
        teacherDocument = await this.teacherModel
          .findOne({ user: new Types.ObjectId(id) })
          .populate('user')
          .exec();
      }
    }

    if (teacherDocument) {
      const linkedUser = teacherDocument.user as any;
      const user =
        linkedUser instanceof Types.ObjectId
          ? await this.usersService.findById(linkedUser.toString())
          : (linkedUser as User);

      if (!user || user.role !== Role.TEACHER) {
        throw new NotFoundException('Teacher not found');
      }

      return { user, teacher: teacherDocument };
    }

    const user = await this.usersService.findById(id);
    if (!user || user.role !== Role.TEACHER) {
      throw new NotFoundException('Teacher not found');
    }

    const fallbackTeacherDocument = await this.teacherModel
      .findOne({ user: user._id })
      .exec();

    return { user, teacher: fallbackTeacherDocument };
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
    const { user: teacher, teacher: teacherDocument } =
      await this.ensureTeacher(teacherId);

    if (teacherDocument?.isTrashed) {
      throw new BadRequestException('Teacher is in the trash');
    }

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
    await this.ensureTeacherIsActive(teacherObjectId);

    await this.classModel.updateMany(
      { _id: { $in: classObjectIds } },
      { $addToSet: { assignedTeachers: teacherObjectId } },
    );

    const updatedTeacherProfile = await this.teacherModel
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
      teacherProfile: updatedTeacherProfile,
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
    const { user: teacher, teacher: teacherDocument } =
      await this.ensureTeacher(teacherId);

    if (teacherDocument?.isTrashed) {
      throw new BadRequestException('Teacher is in the trash');
    }

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
    await this.ensureTeacherIsActive(teacherObjectId);

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

  async removeSubjects(teacherId: string, subjectIds: string[]) {
    const { user: teacher, teacher: teacherDocument } =
      await this.ensureTeacher(teacherId);

    if (teacherDocument?.isTrashed) {
      throw new BadRequestException('Teacher is in the trash');
    }

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
      .select('_id')
      .lean()
      .exec();

    const foundIds = new Set(subjects.map((subject) => subject._id.toString()));
    const missing = uniqueSubjectIds.filter((id) => !foundIds.has(id));
    if (missing.length) {
      throw new NotFoundException(
        `Subjects not found: ${missing.join(', ')}`,
      );
    }

    const teacherObjectId = this.getTeacherObjectId(teacher);
    const existingTeacherProfile = await this.teacherModel
      .findOne({ user: teacherObjectId })
      .populate(['assignedClasses', 'subjectsCanTeach'])
      .exec();

    if (!existingTeacherProfile) {
      throw new NotFoundException('Teacher profile not found');
    }

    if (existingTeacherProfile.isTrashed) {
      throw new BadRequestException('Teacher is in the trash');
    }

    const assignedSubjectIds = new Set(
      this.extractObjectIdStrings(existingTeacherProfile.subjectsCanTeach ?? []),
    );
    const notAssigned = uniqueSubjectIds.filter(
      (id) => !assignedSubjectIds.has(id),
    );
    if (notAssigned.length) {
      throw new BadRequestException(
        `Teacher is not assigned to subjects: ${notAssigned.join(', ')}`,
      );
    }

    const updatedTeacherProfile = await this.teacherModel
      .findOneAndUpdate(
        { user: teacherObjectId },
        { $pull: { subjectsCanTeach: { $in: subjectObjectIds } } },
        { new: true },
      )
      .populate(['assignedClasses', 'subjectsCanTeach'])
      .exec();

    if (!updatedTeacherProfile) {
      throw new NotFoundException('Teacher profile not found');
    }

    const remainingSubjectIds = this.extractObjectIdStrings(
      updatedTeacherProfile.subjectsCanTeach ?? [],
    );

    const updatedUser = await this.usersService.update(
      teacherObjectId.toString(),
      {
        subjectsCanTeach: remainingSubjectIds,
      } as any,
    );

    await this.subjectAssignmentModel
      .updateMany(
        {
          teacher: teacherObjectId,
          subject: { $in: subjectObjectIds },
        },
        { $unset: { teacher: 1 } },
      )
      .exec();

    return {
      message: 'Subjects removed successfully',
      user: updatedUser,
      teacherProfile: updatedTeacherProfile,
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

  private toObjectId(value: string, field: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ${field} "${value}"`);
    }
    return new Types.ObjectId(value);
  }

  private mapToObjectIds(ids: string[]): Types.ObjectId[] {
    return ids.map((id) => this.toObjectId(id, 'teacherId'));
  }

  private async ensureTeacherIsActive(
    teacherUserId: Types.ObjectId,
  ): Promise<void> {
    const teacher = await this.teacherModel
      .findOne({ user: teacherUserId })
      .select('isTrashed')
      .lean()
      .exec();

    if (teacher && teacher.isTrashed) {
      throw new BadRequestException('Teacher is in the trash');
    }
  }

  private extractModifiedCount(result: unknown): number {
    if (
      result &&
      typeof result === 'object' &&
      'modifiedCount' in result &&
      typeof (result as { modifiedCount: unknown }).modifiedCount === 'number'
    ) {
      return (result as { modifiedCount: number }).modifiedCount;
    }

    if (
      result &&
      typeof result === 'object' &&
      'nModified' in result &&
      typeof (result as { nModified: unknown }).nModified === 'number'
    ) {
      return (result as { nModified: number }).nModified;
    }

    return 0;
  }

  private extractDeletedCount(result: unknown): number {
    if (
      result &&
      typeof result === 'object' &&
      'deletedCount' in result &&
      typeof (result as { deletedCount: unknown }).deletedCount === 'number'
    ) {
      return (result as { deletedCount: number }).deletedCount;
    }

    if (
      result &&
      typeof result === 'object' &&
      'n' in result &&
      typeof (result as { n: unknown }).n === 'number'
    ) {
      return (result as { n: number }).n;
    }

    return 0;
  }

  private extractObjectIdStrings(values: any[]): string[] {
    return values
      .map((value) => {
        if (!value) return null;
        if (value instanceof Types.ObjectId) return value.toString();
        if (typeof value === 'string') return value;
        if ((value as any)._id instanceof Types.ObjectId) {
          return (value as any)._id.toString();
        }
        if (typeof (value as any)._id === 'string') {
          return (value as any)._id;
        }
        return null;
      })
      .filter((val): val is string => Boolean(val));
  }
}


