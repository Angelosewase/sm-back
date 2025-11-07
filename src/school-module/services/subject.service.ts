import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subject, SubjectDocument } from '../schemas/subject.schema';
import { CreateSubjectDto } from '../dto/create-subject.dto';
import { UpdateSubjectDto } from '../dto/update-subject.dto';
import { UsersService } from 'src/users/users.service';
import { SchoolModuleService } from '../school-module.service';

@Injectable()
export class SubjectService {
  constructor(
    @InjectModel(Subject.name) private subjectModel: Model<SubjectDocument>,
    private readonly usersService: UsersService,
    private readonly schoolService: SchoolModuleService,
  ) {}

  async createSubject(dto: CreateSubjectDto) {
    if(dto.school) {
      const school_ = await this.schoolService.findOne(dto.school);
      if(!school_) throw new NotFoundException('School with id "' + dto.school + '" not found');
    }
    if(dto.code) {
      const subjectWithcode_ = await this.subjectModel.findOne({code: dto.code}).exec();
      if(subjectWithcode_) throw new NotFoundException('Subject with code "' + dto.code + '" already exists');
    }
    const s = new this.subjectModel(dto);
    return s.save();
  }

  async listSubjects(filter: any = {}) {
    return this.subjectModel.find(filter).exec();
  }

  
  getSubjectById(id: string) {
    return this.subjectModel.findById(id).exec();
  }

  async updateSubject(id: string, dto: UpdateSubjectDto) {
    try {
      let subject_ = await this.subjectModel.findById(id).exec();
      if(!subject_) throw new NotFoundException('Subject with id "' + id + '" not found');
      if(dto.code) {
        const subjectWithcode_ = await this.findSubjectByCode(dto.code);
        if(subjectWithcode_ && subjectWithcode_.code?.toString() !== dto.code) throw new BadRequestException('Subject with code "' + dto.code + '" already exists');
      }
      if(dto.school) {
        const school_ = await this.subjectModel.findOne({school: dto.school}).exec();
        if(!school_) throw new NotFoundException('School with id "' + dto.school + '" not found');
      }
      return this.subjectModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    } catch (error) {
      throw error
    }
  }

  async findSubjectByCode(code?:string):Promise<Subject> {
    let _sub =  await  this.subjectModel.findOne({code}).exec();
    if(_sub) return _sub;
    throw new NotFoundException('Subject with code "' + code + '" not found');
  }

  async deleteSubject(id: string) {
    return this.subjectModel.findByIdAndDelete(id).exec();
  }
}
