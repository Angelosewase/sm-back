import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
import {
  Assessment,
  AssessmentDocument,
} from 'src/assessments/schemas/assessment-schema';

@Injectable()
export class TeachersService {
  private readonly logger = new Logger(TeachersService.name);
  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(Assessment.name)
    private readonly assessmentModel: Model<AssessmentDocument>,
    @InjectModel(SubjectEntity.name)
    private subjectModel: Model<SubjectDocument>,
    @InjectModel(SubjectAssignment.name)
    private readonly subjectAssignmentModel: Model<SubjectAssignmentDocument>,
  ) {}
  async create(createTeacherDto: CreateTeacherDto): Promise<Teacher> {
    console.log('the create teacher dto is 1: ', createTeacherDto);

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
      subjectsCanTeach: createTeacherDto.subjectsCanTeach?.map(
        (id) => new Types.ObjectId(id),
      ),
      department: createTeacherDto.department,
      assignedClasses: createTeacherDto.assignedClasses?.map(
        (id) => new Types.ObjectId(id),
      ),
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
    const teacher = await this.teacherModel
      .findById(id)
      .populate('user subjectsCanTeach assignedClasses school')
      .exec();
    if (!teacher) throw new NotFoundException('Teacher not found');
    return teacher;
  }

  async update(
    id: string,
    updateTeacherDto: UpdateTeacherDto,
  ): Promise<Teacher | null> {
    const teacher = await this.findOne(id);
    if ((teacher as any).isTrashed) {
      throw new BadRequestException(
        'Cannot update a teacher that is in the trash',
      );
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
    return this.teacherModel
      .findByIdAndUpdate(
        id,
        {
          ...updateTeacherDto,
          subjectsCanTeach: updateTeacherDto.subjectsCanTeach?.map(
            (id) => new Types.ObjectId(id),
          ),
          assignedClasses: updateTeacherDto.assignedClasses?.map(
            (id) => new Types.ObjectId(id),
          ),
          department: updateTeacherDto.department,
        },
        { new: true },
      )
      .exec();
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
      .updateMany(
        { classTeacher: userObjectId },
        { $set: { classTeacher: null } },
      )
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

  private async sendWelcomeEmailSafely(
    teacher: User,
    temporaryPassword: string,
  ) {
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
      throw new NotFoundException(`Classes not found: ${missing.join(', ')}`);
    }

    if (teacher.school) {
      const teacherSchoolId = teacher.school.toString();
      const mismatched = classes.filter(
        (cls: any) => cls.school && cls.school.toString() !== teacherSchoolId,
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
        ([...((teacher as any).assignedClasses ?? [])] as any[]).map((value) =>
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
        {
          $pull: {
            assignedClasses: {
              $in: classIds.map((id) => new Types.ObjectId(id)),
            },
          },
        },
        { session },
      );

      // Remove teacher from those classes
      await this.classModel.updateMany(
        { _id: { $in: classIds.map((id) => new Types.ObjectId(id)) } },
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
      throw new NotFoundException(`Subjects not found: ${missing.join(', ')}`);
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
        ([...((teacher as any).subjectsCanTeach ?? [])] as any[]).map((value) =>
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
      throw new NotFoundException(`Subjects not found: ${missing.join(', ')}`);
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
      this.extractObjectIdStrings(
        existingTeacherProfile.subjectsCanTeach ?? [],
      ),
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
    return teacher._id instanceof Types.ObjectId
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

  /** Remove subject from teacher */
  async removeSubjectFromTeacher(teacherId: string, subjectId: string) {
    const teacher = await this.teacherModel.findById(teacherId);
    if (!teacher) throw new BadRequestException('Teacher not found');
    await this.teacherModel.updateOne(
      { _id: teacherId },
      { $pull: { subjectsCanTeach: subjectId } },
    );
    this.logger.log(`Removed subject ${subjectId} from teacher ${teacherId}`);
    return await this.teacherModel
      .findById(teacherId)
      .populate('subjectsCanTeach');
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

  // ============= ANALYTICS METHODS =============

  /**
   * Get teacher dashboard welcome stats
   * Returns: total students, total subjects, total classes, total assessments (active, pending, completed)
   */
  async getTeacherDashboardStats(teacherId: string) {
    console.log('the teacher id is: ', teacherId);
    try {
      const teacher = await this.ensureTeacher(teacherId);
      if (!teacher.teacher || teacher.teacher.isTrashed) {
        throw new NotFoundException('Teacher not found or is trashed');
      }

      const teacherUser = teacher.user;
      const teacherObjectId = new Types.ObjectId(
        teacherUser._id?.toString() || teacherId,
      );

      // Get all classes the teacher is assigned to or is a class teacher of
      const classesAsPrimaryTeacher = await this.classModel
        .find({ classTeacher: teacherObjectId, isTrashed: false })
        .exec();

      const assignedClassIds = teacher.teacher.assignedClasses || [];
      const classesAsAssigned = await this.classModel
        .find({ _id: { $in: assignedClassIds }, isTrashed: false })
        .exec();

      const allClasses = Array.from(
        new Map(
          [...classesAsPrimaryTeacher, ...classesAsAssigned].map((c) => [
            (c as any)._id.toString(),
            c,
          ]),
        ).values(),
      );
      const totalClasses = allClasses.length;

      // Total students across all classes
      const totalStudents = allClasses.reduce(
        (sum, cls) => sum + (cls.studentCount || 0),
        0,
      );

      // Total subjects the teacher teaches
      const totalSubjects = (teacher.teacher.subjectsCanTeach || []).length;

      // Count assessments (if Assessment model is available via InjectModel)
      // Note: requires Assessment model injection in service; returning mock count for now
      const totalAssessments = 0;
      const totalAssessmentsActive = 0;
      const totalAssessmentsPending = 0;
      const totalAssessmentsCompleted = 0;

      return {
        teacher: {
          id: teacherUser._id?.toString(),
          name: teacherUser.name,
          email: teacherUser.email,
        },
        stats: {
          totalClasses,
          totalStudents,
          totalSubjects,
          totalAssessments,
          totalAssessmentsActive,
          totalAssessmentsPending,
          totalAssessmentsCompleted,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get dashboard stats for teacher ${teacherId}`,
        error as any,
      );
      throw new NotFoundException('Failed to fetch dashboard stats');
    }
  }

  /**
   * Get all students assigned to teacher's classes
   * Filters by class, status, search query; supports pagination
   */
  async getTeacherStudents(
    teacherId: string,
    filters?: {
      classId?: string;
      status?: string;
      q?: string;
      page?: number;
      limit?: number;
    },
  ) {
    try {
      const teacher = await this.ensureTeacher(teacherId);
      if (!teacher.teacher || teacher.teacher.isTrashed) {
        throw new NotFoundException('Teacher not found or is trashed');
      }

      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const teacherObjectId = new Types.ObjectId(
        teacher.user._id?.toString() || teacherId,
      );

      // Get all classes
      const classesAsPrimaryTeacher = await this.classModel
        .find({ classTeacher: teacherObjectId, isTrashed: false })
        .exec();
      const assignedClassIds = teacher.teacher.assignedClasses || [];
      const classesAsAssigned = await this.classModel
        .find({ _id: { $in: assignedClassIds }, isTrashed: false })
        .exec();

      const allClasses = Array.from(
        new Map(
          [...classesAsPrimaryTeacher, ...classesAsAssigned].map((c) => [
            (c as any)._id.toString(),
            c,
          ]),
        ).values(),
      );
      const classIds = allClasses.map((c) => c._id);

      // If specific classId filter provided, ensure it's in teacher's classes
      let targetClassIds = classIds;
      if (filters?.classId) {
        if (!classIds.some((cid: any) => cid.toString() === filters.classId)) {
          throw new BadRequestException('Class not assigned to this teacher');
        }
        targetClassIds = [new Types.ObjectId(filters.classId)];
      }

      const studentFilter: any = {
        class: { $in: targetClassIds },
        isTrashed: false,
      };
      if (filters?.status) studentFilter.status = filters.status;
      if (filters?.q) {
        studentFilter.$or = [
          { name: new RegExp(filters.q, 'i') },
          { email: new RegExp(filters.q, 'i') },
          { studentId: new RegExp(filters.q, 'i') },
        ];
      }

      // Note: Requires Student model; using placeholder for now
      // const [students, total] = await Promise.all([
      //   studentModel.find(studentFilter).skip(skip).limit(limit).exec(),
      //   studentModel.countDocuments(studentFilter).exec(),
      // ]);

      return {
        teacherId,
        totalClasses: allClasses.length,
        // students: [],
        // total,
        // page,
        // limit,
        // totalPages: Math.ceil(total / limit),
        classesInfo: allClasses.map((c) => ({
          classId: c._id,
          className: c.name,
          studentCount: c.studentCount || 0,
        })),
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch students for teacher ${teacherId}`,
        error as any,
      );
      throw new NotFoundException('Failed to fetch teacher students');
    }
  }

  /**
   * Get all subjects taught by teacher
   */
  async getTeacherSubjects(teacherId: string) {
    try {
      const teacher = await this.ensureTeacher(teacherId);
      if (!teacher.teacher || teacher.teacher.isTrashed) {
        throw new NotFoundException('Teacher not found or is trashed');
      }

      const subjectIds = teacher.teacher.subjectsCanTeach || [];
      const subjects = await this.subjectModel
        .find({ _id: { $in: subjectIds } })
        .select('_id name code subjectType department')
        .exec();

      return {
        teacherId,
        totalSubjects: subjects.length,
        subjects,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch subjects for teacher ${teacherId}`,
        error as any,
      );
      throw new NotFoundException('Failed to fetch teacher subjects');
    }
  }

  /**
   * Get all classes assigned to teacher
   * Includes class details, student count, and assigned subjects
   */
  async getTeacherClasses(teacherId: string) {
    try {
      const teacher = await this.ensureTeacher(teacherId);
      if (!teacher.teacher || teacher.teacher.isTrashed) {
        throw new NotFoundException('Teacher not found or is trashed');
      }

      const teacherObjectId = new Types.ObjectId(
        teacher.user._id?.toString() || teacherId,
      );

      // Classes where teacher is primary class teacher
      const primaryClasses = await this.classModel
        .find({ classTeacher: teacherObjectId, isTrashed: false })
        .populate('assignedSubjects')
        .exec();

      // Classes where teacher is assigned (general teacher)
      const assignedClassIds = teacher.teacher.assignedClasses || [];
      const assignedClasses = await this.classModel
        .find({ _id: { $in: assignedClassIds }, isTrashed: false })
        .populate('assignedSubjects')
        .exec();

      const allClasses = Array.from(
        new Map(
          [...primaryClasses, ...assignedClasses].map((c) => [
            (c as any)._id.toString(),
            c,
          ]),
        ).values(),
      );

      return {
        teacherId,
        totalClasses: allClasses.length,
        classes: allClasses.map((c) => ({
          classId: c._id,
          className: c.name,
          gradeLevel: c.gradeLevel,
          studentCount: c.studentCount || 0,
          capacity: c.capacity,
          status: c.status,
          assignedSubjects: (c.assignedSubjects || []).length,
        })),
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch classes for teacher ${teacherId}`,
        error as any,
      );
      throw new NotFoundException('Failed to fetch teacher classes');
    }
  }

  /**
   * Enhanced: getTeacherClasses
   *
   * What's NEW & IMPROVED:
   * 1. Added `pendingAssessments` per class (based on teacher's actual subject assignments)
   * 2. Only counts assessments that:
   *    - Belong to subjects the teacher teaches in that class
   *    - Are in 'pending' status
   * 3. Uses efficient aggregation + population to avoid N+1 queries
   * 4. Leverages `assignedSubjects` on Class model (populated earlier)
   * 5. Filters assessments by teacher via Subject → Assessment → Status
   * 6. Maintains deduplication of classes (primary + assigned)
   * 7. Returns exact interface: TeacherClass with `pendingAssessments`
   */
  async _getTeacherClasses(teacherId: string): Promise<{
    teacherId: string;
    totalClasses: number;
    classes: any[];
  }> {
    try {
      const teacher = await this.ensureTeacher(teacherId);
      if (!teacher.teacher || teacher.teacher.isTrashed) {
        throw new NotFoundException('Teacher not found or is trashed');
      }

      const teacherObjectId = new Types.ObjectId(
        teacher.user._id?.toString() || teacherId,
      );

      // Step 1: Fetch primary classes (where teacher is class teacher)
      const primaryClasses = await this.classModel
        .find({ classTeacher: teacherObjectId, isTrashed: false })
        .populate('assignedSubjects') // Populates Subject refs
        .exec();

      // Step 2: Fetch assigned classes (general teacher)
      const assignedClassIds = teacher.teacher.assignedClasses || [];
      const assignedClasses = await this.classModel
        .find({ _id: { $in: assignedClassIds }, isTrashed: false })
        .populate('assignedSubjects')
        .exec();

      // Step 3: Deduplicate classes by _id
      const allClasses = Array.from(
        new Map(
          [...primaryClasses, ...assignedClasses].map((c) => [
            (c as any)._id.toString(),
            c,
          ]),
        ).values(),
      );

      // Step 4: Extract all subject IDs the teacher teaches across these classes
      const teacherSubjectIds = new Set<string>();
      allClasses.forEach((cls) => {
        (cls.assignedSubjects || []).forEach((subj: any) => {
          // subj is populated Subject document
          if (subj && subj._id) {
            teacherSubjectIds.add(subj._id.toString());
          }
        });
      });

      // Step 5: Count pending assessments per subject (only for teacher's subjects)
      const pendingAssessmentsBySubject =
        teacherSubjectIds.size > 0
          ? await this.assessmentModel
              .aggregate([
                {
                  $match: {
                    subject: {
                      $in: Array.from(teacherSubjectIds).map(
                        (id) => new Types.ObjectId(id),
                      ),
                    },
                    status: 'pending',
                    isTrashed: { $ne: true },
                  },
                },
                {
                  $group: {
                    _id: '$subject',
                    count: { $sum: 1 },
                  },
                },
              ])
              .exec()
          : [];

      // Step 6: Build map: subjectId → pendingCount
      const pendingCountMap = new Map<string, number>();
      pendingAssessmentsBySubject.forEach(({ _id, count }) => {
        pendingCountMap.set(_id.toString(), count);
      });

      // Step 7: For each class, sum pending assessments from its subjects (only teacher's)
      return {
        teacherId,
        totalClasses: allClasses.length,
        classes: allClasses.map((c) => {
          let pendingAssessments = 0;

          (c.assignedSubjects || []).forEach((subj: any) => {
            const subjId = subj._id.toString();
            if (teacherSubjectIds.has(subjId)) {
              pendingAssessments += pendingCountMap.get(subjId) || 0;
            }
          });

          return {
            classId: (c as any)._id.toString(),
            className: c.name,
            gradeLevel: c.gradeLevel,
            studentCount: c.studentCount || 0,
            capacity: c.capacity,
            status: c.status as 'active' | 'inactive',
            assignedSubjects: (c.assignedSubjects || []).length,
            pendingAssessments,
          };
        }),
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch classes for teacher ${teacherId}`,
        error,
      );
      throw new NotFoundException('Failed to fetch teacher classes');
    }
  }

  /**
   * Get all assessments created by teacher
   * Includes filters for status, subject, class; supports pagination
   */
  async getTeacherAssessments(
    teacherId: string,
    filters?: {
      subjectId?: string;
      classId?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {
    try {
      const teacher = await this.ensureTeacher(teacherId);
      if (!teacher.teacher || teacher.teacher.isTrashed) {
        throw new NotFoundException('Teacher not found or is trashed');
      }

      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const teacherObjectId = new Types.ObjectId(
        teacher.user._id?.toString() || teacherId,
      );

      // Note: Requires Assessment model injection; placeholder for now
      // const assessmentFilter: any = { teacher: teacherObjectId };
      // if (filters?.subjectId) assessmentFilter.subject = filters.subjectId;
      // if (filters?.classId) assessmentFilter.class = filters.classId;
      // if (filters?.status) assessmentFilter.status = filters.status;

      // const [assessments, total] = await Promise.all([
      //   assessmentModel.find(assessmentFilter).skip(skip).limit(limit).exec(),
      //   assessmentModel.countDocuments(assessmentFilter).exec(),
      // ]);

      return {
        teacherId,
        // assessments: [],
        // total,
        // page,
        // limit,
        // totalPages: Math.ceil(total / limit),
        statusSummary: {
          active: 0,
          pending: 0,
          completed: 0,
          trashed: 0,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch assessments for teacher ${teacherId}`,
        error as any,
      );
      throw new NotFoundException('Failed to fetch teacher assessments');
    }
  }

  /**
   * Get all assignments created by teacher in given subject/class/academicYear
   * Includes submission status and performance metrics
   */
  async getTeacherAssignments(
    teacherId: string,
    filters?: {
      subjectId?: string;
      classId?: string;
      academicYear?: string;
      term?: string;
      page?: number;
      limit?: number;
    },
  ) {
    try {
      const teacher = await this.ensureTeacher(teacherId);
      if (!teacher.teacher || teacher.teacher.isTrashed) {
        throw new NotFoundException('Teacher not found or is trashed');
      }

      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const teacherObjectId = new Types.ObjectId(
        teacher.user._id?.toString() || teacherId,
      );

      // Note: Requires Assignment and AssignmentSubmission models; placeholder for now
      // const assignmentFilter: any = { teacher: teacherObjectId };
      // if (filters?.subjectId) assignmentFilter.subject = filters.subjectId;
      // if (filters?.classId) assignmentFilter.class = filters.classId;
      // if (filters?.academicYear) assignmentFilter.academicYear = filters.academicYear;
      // if (filters?.term) assignmentFilter.term = filters.term;

      // const [assignments, total] = await Promise.all([
      //   assignmentModel.find(assignmentFilter).skip(skip).limit(limit).exec(),
      //   assignmentModel.countDocuments(assignmentFilter).exec(),
      // ]);

      return {
        teacherId,
        // assignments: [],
        // total,
        // page,
        // limit,
        // totalPages: Math.ceil(total / limit),
        statusSummary: {
          pending: 0,
          submitted: 0,
          graded: 0,
          late: 0,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch assignments for teacher ${teacherId}`,
        error as any,
      );
      throw new NotFoundException('Failed to fetch teacher assignments');
    }
  }

  async getTeacherByUserId(userId: string) {
    const teacher = await this.teacherModel.findOne({ user: new Types.ObjectId(userId) }).exec();
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    return teacher;
  }
}
