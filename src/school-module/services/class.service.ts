import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Class, ClassDocument } from '../schemas/class.schema';
import { CreateClassDto } from '../dto/create-class.dto';
import { AuditLog } from '../schemas/audit.schema';
import { Model } from 'mongoose';
import { SchoolModuleService } from '../school-module.service';
import { UsersService } from 'src/users/users.service';

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
      if(dto.capacity && dto.capacity < 0) throw new BadRequestException('Capacity cannot be negative');
      if(dto.school) {
        const school = await this.schoolService.findOne(dto.school);
        if(!school) throw new BadRequestException('School with id "' + dto.school + '" not found');
      }
       const cls = new this.classModel({
      ...dto,
      capacity: dto.capacity ?? undefined,
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
    if(!teacher_) {
      throw new NotFoundException('Teacher not found');
    }else if(teacher_.role !== 'teacher') {
      throw new BadRequestException('User with this id "' + teacherId + '" is not a teacher');
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

  async getClassById(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Invalid class id');
    return this.classModel
      .findById(id)
      .populate(['assignedTeachers', 'subjects', 'formTeacher'])
      .exec();
  }


  async getClassName(classId: string) {
    let cls =  await this.classModel.findOne({ _id: classId }).exec();
     return cls?.name;
  }

  async listClasses(filter: any = {}, pagination: any = {}) {
    const q = this.classModel.find(filter);
    if (pagination.limit) q.limit(pagination.limit);
    if (pagination.skip) q.skip(pagination.skip);
    return q.exec();
  }
}
