import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Enrollment, EnrollmentDocument } from '../schemas/enrollment.schema';

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectModel(Enrollment.name)
    private enrollmentModel: Model<EnrollmentDocument>,
  ) {}

  async enrollStudent(
    studentId: string,
    classId: string,
    academicYear: string,
    entryDate?: Date,
  ) {
    const e = new this.enrollmentModel({
      student: studentId,
      class: classId,
      academicYear,
      entryDate,
    });
    return e.save();
  }
}
