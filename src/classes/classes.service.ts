import {
  BadRequestException,
  Injectable,
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

@Injectable()
export class ClassesService {
  constructor(
    @InjectModel(Class.name) private readonly classModel: Model<Class>,
    private readonly usersService: UsersService,
  ) {}

  async create(createClassDto: CreateClassDto): Promise<Class> {
    const teacherId = new Types.ObjectId(createClassDto.classTeacher);
    await this.ensureTeacherExists(teacherId);

    const createdClass = new this.classModel({
      ...createClassDto,
      classTeacher: teacherId,
      status: createClassDto.status ?? ClassStatus.ACTIVE,
      studentCount: 0,
    });

    return createdClass.save();
  }

  async findAll(query: QueryClassesDto) {
    const { page = 1, limit = 10, search, gradeLevel } = query;

    const paginationLimit = limit > 100 ? 100 : limit;
    const skip = (page - 1) * paginationLimit;

    const filter: FilterQuery<Class> = {};

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

    return {
      data: items,
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

    return classEntity;
  }

  async update(id: string, updateClassDto: UpdateClassDto): Promise<Class> {
    const classEntity = await this.classModel.findById(id).exec();

    if (!classEntity) {
      throw new NotFoundException(`Class with id ${id} not found`);
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
    const result = await this.classModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Class with id ${id} not found`);
    }
  }

  async incrementStudentCount(id: string, amount = 1): Promise<Class> {
    if (amount <= 0) {
      throw new BadRequestException('Increase amount must be greater than zero');
    }

    const classEntity = await this.classModel.findById(id).exec();

    if (!classEntity) {
      throw new NotFoundException(`Class with id ${id} not found`);
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
      throw new BadRequestException('Decrease amount must be greater than zero');
    }

    const classEntity = await this.classModel.findById(id).exec();

    if (!classEntity) {
      throw new NotFoundException(`Class with id ${id} not found`);
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

  private async ensureTeacherExists(teacherId: Types.ObjectId): Promise<void> {
    const teacher = await this.usersService.findById(teacherId.toString());

    if (!teacher) {
      throw new BadRequestException('Class teacher does not exist');
    }

    if (teacher.role !== Role.TEACHER) {
      throw new BadRequestException('Assigned class teacher must have teacher role');
    }
  }
}

