import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Student, StudentDocument } from './schemas/student.schema';
import { CreateStudentDto } from './dto/create-student.dto';

@Injectable()
export class StudentService {
  constructor(
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
  ) {}

  async registerStudent(dto: CreateStudentDto) {
    const s = new this.studentModel({
      ...dto,
      fullName: `${dto.firstName} ${dto.lastName}`,
    });
    try {
      return await s.save();
    } catch (e) {
      if (e.code === 11000)
        throw new BadRequestException('Duplicate studentId for school');
      throw e;
    }
  }

  async getStudentById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.studentModel.findById(id).exec();
  }
}
