import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { Role } from '../users/schemas/user.schema';
import { Class, ClassStatus } from './schemas/class.schema';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { QueryClassesDto } from './dto/query-classes.dto';
import { Teacher, TeacherDocument } from '../teachers/schemas/teacher.schema';
import {
  SubjectAssignment,
  SubjectAssignmentDocument,
} from '../subjects/schemas/subject-assignment.schema';

@Injectable()
export class ClassesService {
  private readonly logger = new Logger('ClassesService');
  constructor(
    @InjectModel(Class.name) private readonly classModel: Model<Class>,
    private readonly usersService: UsersService,
    @InjectModel(Teacher.name)
    private readonly teacherModel: Model<TeacherDocument>,
    @InjectModel(SubjectAssignment.name)
    private readonly subjectAssignmentModel: Model<SubjectAssignmentDocument>,
  ) {}

  async create(createClassDto: CreateClassDto): Promise<Class> {
    const { classTeacher, ...classData } = createClassDto;

    let teacherId: Types.ObjectId | undefined;
    if (classTeacher) {
      teacherId = new Types.ObjectId(classTeacher);
      await this.ensureTeacherExists(teacherId);
    }

    const createdClass = new this.classModel({
      ...classData,
      status: classData.status ?? ClassStatus.ACTIVE,
      studentCount: 0,
      isTrashed: false,
      trashedAt: null,
    });

    if (teacherId) {
      createdClass.classTeacher = teacherId;
    }

    return createdClass.save();
  }

  async findAll(query: QueryClassesDto) {
    const {
      page = 1,
      limit = 10,
      search,
      gradeLevel,
      includeTrashed,
      onlyTrashed,
    } = query;

    const paginationLimit = limit > 100 ? 100 : limit;
    const skip = (page - 1) * paginationLimit;

    const filter: FilterQuery<Class> = {};

    if (onlyTrashed) {
      filter.isTrashed = true;
    } else if (!includeTrashed) {
      filter.isTrashed = false;
    }

    if (gradeLevel) {
      filter.gradeLevel = gradeLevel;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.classModel
        .find(filter)
        .skip(skip)
        .limit(paginationLimit)
        .populate('classTeacher')
        .exec(),
      this.classModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / paginationLimit) || 1;

    // Optionally include teacher profile and subjects per class
    const includeTeacherProfile = (query as any).includeTeacherProfile;
    const includeSubjects = (query as any).includeSubjects;

    let enhancedItems = items.map((it) =>
      it && typeof (it as any).toObject === 'function'
        ? (it as any).toObject()
        : it,
    );

    if (includeTeacherProfile) {
      const userIds = enhancedItems
        .map((c: any) => c.classTeacher)
        .filter(Boolean)
        .map((id: any) => id.toString());

      if (userIds.length) {
        const teacherProfiles = await this.teacherModel
          .find({ user: { $in: userIds.map((u) => new Types.ObjectId(u)) } })
          .populate(['user', 'subjectsCanTeach', 'assignedClasses', 'school'])
          .lean()
          .exec();

        const mapByUser: Record<string, any> = {};
        teacherProfiles.forEach((tp: any) => {
          mapByUser[(tp.user as any).toString()] = tp;
        });

        enhancedItems = enhancedItems.map((c: any) => ({
          ...c,
          teacherProfile: c.classTeacher
            ? mapByUser[c.classTeacher.toString()] || null
            : null,
        }));
      }
    }

    if (includeSubjects) {
      const classIds = enhancedItems.map((c: any) => c._id.toString());
      if (classIds.length) {
        const assignments = await this.subjectAssignmentModel
          .find({
            class: { $in: classIds.map((id) => new Types.ObjectId(id)) },
          })
          .populate('subject')
          .populate('teacher', '-password')
          .lean()
          .exec();

        const byClass: Record<string, any[]> = {};
        assignments.forEach((a: any) => {
          const cid = a.class?.toString();
          if (!cid) return;
          byClass[cid] = byClass[cid] || [];
          byClass[cid].push(a);
        });

        enhancedItems = enhancedItems.map((c: any) => ({
          ...c,
          subjectAssignments: byClass[c._id.toString()] || [],
          subjects: (byClass[c._id.toString()] || [])
            .map((a) => a.subject)
            .filter(Boolean),
        }));
      }
    }

    return {
      data: enhancedItems,
      total,
      page,
      limit: paginationLimit,
      totalPages,
    };
  }

  async findOne(id: string): Promise<Class> {
    const classEntity = await this.classModel
      .findById(id)
      .populate('classTeacher')
      .exec();

    if (!classEntity) {
      throw new NotFoundException(`Class with id ${id} not found`);
    }

    if (classEntity.isTrashed) {
      throw new BadRequestException(
        'Cannot modify a class that is in the trash',
      );
    }

    if (classEntity.isTrashed) {
      throw new BadRequestException(
        'Cannot update a class that is in the trash',
      );
    }

    if (classEntity.isTrashed) {
      throw new NotFoundException(`Class with id ${id} not found`);
    }

    // Optionally attach teacher profile and subjects
    const includeTeacherProfile = {} as any; // placeholder to avoid TS unused
    const includeSubjects = {} as any;
    // Note: we can't access request query here; callers can call dedicated service methods or set flags.

    // Fetch teacher profile
    let result: any =
      classEntity && typeof (classEntity as any).toObject === 'function'
        ? (classEntity as any).toObject()
        : classEntity;

    try {
      const teacherProfile = result.classTeacher
        ? await this.teacherModel
            .findOne({ user: new Types.ObjectId(result.classTeacher) })
            .populate(['user', 'subjectsCanTeach', 'assignedClasses', 'school'])
            .lean()
            .exec()
        : null;

      result.teacherProfile = teacherProfile || null;

      // Fetch subject assignments for this class
      const assignments = await this.subjectAssignmentModel
        .find({ class: new Types.ObjectId(result._id) })
        .populate('subject')
        .populate('teacher', '-password')
        .lean()
        .exec();

      result.subjectAssignments = assignments;
      result.subjects = assignments.map((a) => a.subject).filter(Boolean);
    } catch (err) {
      // Non-blocking – return what we have
      this.logger.warn(
        'Failed to fetch teacher profile or subjects for class',
        err,
      );
    }

    return result;
  }

  async update(id: string, updateClassDto: UpdateClassDto): Promise<Class> {
    const classEntity = await this.classModel.findById(id).exec();

    if (!classEntity) {
      throw new NotFoundException(`Class with id ${id} not found`);
    }

    if (classEntity.isTrashed) {
      throw new BadRequestException(
        'Cannot modify a class that is in the trash',
      );
    }

    if (updateClassDto.classTeacher) {
      const teacherId = new Types.ObjectId(updateClassDto.classTeacher);
      await this.ensureTeacherExists(teacherId);
      classEntity.classTeacher = teacherId;
    }

    if (updateClassDto.name !== undefined) {
      classEntity.name = updateClassDto.name;
    }

    if (updateClassDto.gradeLevel !== undefined) {
      classEntity.gradeLevel = updateClassDto.gradeLevel;
    }

    if (updateClassDto.capacity !== undefined) {
      if (updateClassDto.capacity < classEntity.studentCount) {
        throw new BadRequestException(
          'Capacity cannot be less than current student count',
        );
      }
      classEntity.capacity = updateClassDto.capacity;
    }

    if (updateClassDto.description !== undefined) {
      classEntity.description = updateClassDto.description;
    }

    if (updateClassDto.status !== undefined) {
      classEntity.status = updateClassDto.status;
    }

    await classEntity.save();

    return this.classModel
      .findById(id)
      .populate('classTeacher')
      .exec() as Promise<Class>;
  }

  async remove(id: string): Promise<void> {
    const classEntity = await this.classModel.findById(id).exec();

    if (!classEntity) {
      throw new NotFoundException(`Class with id ${id} not found`);
    }

    if (classEntity.isTrashed) {
      throw new BadRequestException('Class is already in the trash');
    }

    classEntity.isTrashed = true;
    classEntity.trashedAt = new Date();
    await classEntity.save();
  }

  async restore(id: string): Promise<Class> {
    const classEntity = await this.classModel.findById(id).exec();

    if (!classEntity) {
      throw new NotFoundException(`Class with id ${id} not found`);
    }

    if (!classEntity.isTrashed) {
      throw new BadRequestException('Class is not in the trash');
    }

    classEntity.isTrashed = false;
    classEntity.trashedAt = null;
    await classEntity.save();

    return this.classModel
      .findById(id)
      .populate('classTeacher')
      .exec() as Promise<Class>;
  }

  async removePermanently(id: string): Promise<void> {
    const classEntity = await this.classModel.findById(id).exec();

    if (!classEntity) {
      throw new NotFoundException(`Class with id ${id} not found`);
    }

    if (!classEntity.isTrashed) {
      throw new BadRequestException(
        'Class must be moved to trash before permanent deletion',
      );
    }

    await this.classModel.deleteOne({ _id: id }).exec();
  }

  async bulkTrash(ids: string[]): Promise<{ modifiedCount: number }> {
    const objectIds = this.mapToObjectIds(ids);
    const trashedAt = new Date();

    const result = await this.classModel
      .updateMany(
        { _id: { $in: objectIds }, isTrashed: false },
        { $set: { isTrashed: true, trashedAt } },
      )
      .exec();

    return { modifiedCount: this.extractModifiedCount(result) };
  }

  async bulkRestore(ids: string[]): Promise<{ modifiedCount: number }> {
    const objectIds = this.mapToObjectIds(ids);

    const result = await this.classModel
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

    const result = await this.classModel
      .deleteMany({ _id: { $in: objectIds }, isTrashed: true })
      .exec();

    return { deletedCount: this.extractDeletedCount(result) };
  }

  async incrementStudentCount(id: string, amount = 1): Promise<Class> {
    if (amount <= 0) {
      throw new BadRequestException(
        'Increase amount must be greater than zero',
      );
    }

    const classEntity = await this.classModel.findById(id).exec();

    if (!classEntity) {
      throw new NotFoundException(`Class with id ${id} not found`);
    }

    if (classEntity.isTrashed) {
      throw new BadRequestException(
        'Cannot modify a class that is in the trash',
      );
    }

    if (classEntity.studentCount + amount > classEntity.capacity) {
      throw new BadRequestException('Student count cannot exceed capacity');
    }

    classEntity.studentCount += amount;
    await classEntity.save();

    return this.classModel
      .findById(id)
      .populate('classTeacher')
      .exec() as Promise<Class>;
  }

  async decrementStudentCount(id: string, amount = 1): Promise<Class> {
    if (amount <= 0) {
      throw new BadRequestException(
        'Decrease amount must be greater than zero',
      );
    }

    const classEntity = await this.classModel.findById(id).exec();

    if (!classEntity) {
      throw new NotFoundException(`Class with id ${id} not found`);
    }

    if (classEntity.isTrashed) {
      throw new BadRequestException(
        'Cannot modify a class that is in the trash',
      );
    }

    if (classEntity.studentCount - amount < 0) {
      throw new BadRequestException('Student count cannot be negative');
    }

    classEntity.studentCount -= amount;
    await classEntity.save();

    return this.classModel
      .findById(id)
      .populate('classTeacher')
      .exec() as Promise<Class>;
  }

  private mapToObjectIds(ids: string[]): Types.ObjectId[] {
    return ids.map((id) => new Types.ObjectId(id));
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

  private async ensureTeacherExists(teacherId: Types.ObjectId): Promise<void> {
    const teacher = await this.usersService.findById(teacherId.toString());

    if (!teacher) {
      throw new BadRequestException('Class teacher does not exist');
    }

    if (teacher.role !== Role.TEACHER) {
      throw new BadRequestException(
        'Assigned class teacher must have teacher role',
      );
    }
  }
}
