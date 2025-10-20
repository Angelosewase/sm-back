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

@Injectable()
export class ClassService {
  constructor(
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLog>,
  ) {}

  async createClass(dto: CreateClassDto, actorUser: any) {
    // basic permission checks should be applied in controller/guards
    const cls = new this.classModel({
      ...dto,
      capacity: dto.capacity ?? undefined,
    });
    try {
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
        collection: 'class',
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

  async listClasses(filter: any = {}, pagination: any = {}) {
    const q = this.classModel.find(filter);
    if (pagination.limit) q.limit(pagination.limit);
    if (pagination.skip) q.skip(pagination.skip);
    return q.exec();
  }
}
