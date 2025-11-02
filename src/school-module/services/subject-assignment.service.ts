import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SubjectAssignment,
  SubjectAssignmentDocument,
} from '../schemas/subject-assignment.schema';

@Injectable()
export class SubjectAssignmentService {
  constructor(
    @InjectModel(SubjectAssignment.name)
    private saModel: Model<SubjectAssignmentDocument>,
  ) {}

  async assignSubjectToClass(
    classId: string,
    subjectId: string,
    academicYear: string,
    teacherId?: string,
  ) {
    const rec = new this.saModel({
      class: classId,
      subject: subjectId,
      academicYear,
      teacher: teacherId,
    });
    return rec.save();
  }
}
