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

}
