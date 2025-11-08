import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, ObjectId, Types } from 'mongoose';
import { Class, ClassDocument } from '../schemas/class.schema';
import { CreateClassDto } from '../dto/create-class.dto';
import { AuditLog } from '../schemas/audit.schema';
import { Model } from 'mongoose';
import { SchoolModuleService } from '../school-module.service';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/schemas/user.schema';
import { QueryClassDto } from '../dto/query-class.dto';

@Injectable()
export class ClassService {
  constructor(
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLog>,
    private readonly schoolService: SchoolModuleService,
    private readonly usersService: UsersService,
  ) {}

  async createClass(dto: CreateClassDto, actorUser: any) {
    // basic permission checks should be applied in controller/guards

    try {
      if (dto.capacity && dto.capacity < 0)
        throw new BadRequestException('Capacity cannot be negative');
      if (dto.school) {
        const school = await this.schoolService.findOne(dto.school);
        if (!school)
          throw new BadRequestException(
            'School with id "' + dto.school + '" not found',
          );
      }
      if (dto.formTeacher) {
        const teacher = await this.usersService.findById(dto.formTeacher);
        if (!teacher)
          throw new BadRequestException(
            'Form teacher with id "' + dto.formTeacher + '" not found',
          );
        if (teacher.role !== 'teacher')
          throw new BadRequestException(
            'User with id "' + dto.formTeacher + '" is not a teacher',
          );
      }
      const cls = new this.classModel({
        ...dto,
        capacity: dto.capacity ?? undefined,
        formTeacher: dto.formTeacher ?? undefined,
      });

      return await cls.save();
    } catch (e) {
      if (e.code === 11000)
        throw new BadRequestException(
          'Class with same name exists for this school/year',
        );
      throw e;
    }
  }

  async assignTeacherToClass(
    classId: string,
    teacherId: string,
    actorUser: any,
  ) {
    //validate the teacher id
    let teacher_ = await this.usersService.findById(teacherId);
    if (!teacher_) {
      throw new NotFoundException('Teacher not found');
    } else if (teacher_.role !== 'teacher') {
      throw new BadRequestException(
        'User with this id "' + teacherId + '" is not a teacher',
      );
    }
    const cls = await this.classModel.findById(classId).exec();
    if (!cls) throw new NotFoundException('Class not found');
    const before = cls.toObject();
    if (!Types.ObjectId.isValid(teacherId)) {
      throw new BadRequestException('Invalid teacher id');
    }
    const teacherObj = new Types.ObjectId(teacherId);
    cls.assignedTeachers = Array.from(
      new Set([...(cls.assignedTeachers || []), teacherObj]),
    );
    await cls.save();
    const after = cls.toObject();
    try {
      const rec = new this.auditModel({
        user: actorUser?.id,
        action: 'assignTeacher',
        _collection: 'class',
        documentId: classId,
        before,
        after,
      });
      await rec.save();
    } catch (e) {}
    return cls;
  }


  async getClassName(classId: string) {
    let cls = await this.classModel.findOne({ _id: classId }).exec();
    return cls?.name;
  }

  async listClasses(query: any) {
    const {
          q,
          page = 1,
          limit = 10,
          sortBy = 'createdAt',
          order = 'desc',
        } = query;
    
        const filter: FilterQuery<Class> = {};
        
        if (q) {
          const regex = new RegExp(q, 'i');
          filter.$or = [
            { name: regex },
            { grade: regex },
            { level: regex },
            { status: regex },
          ];
        }
    
        const skip = (page - 1) * limit;
        const sort: Record<string, 1 | -1> = { [sortBy]: order === 'asc' ? 1 : -1 };
    
        const [items, total] = await Promise.all([
          this.classModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
          this.classModel.countDocuments(filter).exec(),
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


   async findAll(query: QueryClassDto = {}) {
    const {
      school,
      academicYear,
      level,
      status,
      q,
      page = 1,
      limit = 100,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    // Build filter object
    const filter: FilterQuery<Class> = {};

    if (school) {
      filter.school = school;
    }

    if (academicYear) {
      filter.academicYear = academicYear;
    }

    if (level) {
      filter.level = level;
    }

    if (status) {
      filter.status = status;
    }

    // Text search across multiple fields
    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { name: regex },
        { code: regex },
        { program: regex },
        { stream: regex },
        { description: regex },
      ];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: order === 'asc' ? 1 : -1 };

    // Execute query with pagination
    const [items, total] = await Promise.all([
      this.classModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('school', 'name code')
        .populate('formTeacher', 'name email')
        .populate('assignedTeachers', 'name email')
        .exec(),
      this.classModel.countDocuments(filter).exec(),
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

  async getClassById(id: string) {
    const classDoc = await this.classModel
      .findById(id)
      .populate('school')
      .populate('formTeacher', 'name email')
      .populate('assignedTeachers', 'name email')
      .exec();

    if (!classDoc) {
      throw new NotFoundException(`Class with id "${id}" not found`);
    }

    return classDoc;
  }

  async findClassesBySchool(schoolId: string, academicYear?: string) {
    const filter: FilterQuery<Class> = { school: schoolId };
    if (academicYear) {
      filter.academicYear = academicYear;
    }

    return this.classModel
      .find(filter)
      .sort({ name: 1 })
      .populate('formTeacher', 'name email')
      .exec();
  }

  async findActiveClassesBySchool(schoolId: string, academicYear?: string) {
    const filter: FilterQuery<Class> = {
      school: schoolId,
      status: 'active',
    };
    if (academicYear) {
      filter.academicYear = academicYear;
    }

    return this.classModel
      .find(filter)
      .sort({ name: 1 })
      .exec();
  }
  
}
