import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subject, SubjectDocument } from '../schemas/subject.schema';
import { CreateSubjectDto } from '../dto/create-subject.dto';

@Injectable()
export class SubjectService {
  constructor(
    @InjectModel(Subject.name) private subjectModel: Model<SubjectDocument>,
  ) {}

  async createSubject(dto: CreateSubjectDto) {
    const s = new this.subjectModel(dto);
    return s.save();
  }

  async listSubjects(filter: any = {}) {
    return this.subjectModel.find(filter).exec();
  }
}
