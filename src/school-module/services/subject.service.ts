import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Subject, SubjectDocument} from '../schemas/subject.schema';
import { CreateSubjectDto } from '../dto/create-subject.dto';
import { UpdateSubjectDto } from '../dto/update-subject.dto';
import { UsersService } from 'src/users/users.service';
import { SchoolModuleService } from '../school-module.service';
import { QuerySubjectDto } from '../dto/query-subject.dto';

@Injectable()
export class SubjectService {
  constructor(
    @InjectModel(Subject.name) private subjectModel: Model<Subject>,
    private readonly usersService: UsersService,
    private readonly schoolService: SchoolModuleService,
  ) {}

  async createSubject(dto: CreateSubjectDto) {
    console.log("creating subject")
    // normalize frontend DTO property names to schema fields
    const payload: any = { ...dto } as any;
    if ((dto as any).subjectName) {
      payload.name = (dto as any).subjectName;
      delete payload.subjectName;
    }
    if ((dto as any).subjectCode) {
      payload.code = (dto as any).subjectCode;
      delete payload.subjectCode;
    }
    if ((dto as any).category) {
      payload.subjectType = (dto as any).category;
      delete payload.category;
    }
    if ((dto as any).gradeLevel && !(dto as any).gradeLevels) {
      payload.gradeLevels = [(dto as any).gradeLevel];
      delete payload.gradeLevel;
    }

    if (payload.school) {
      const school_ = await this.schoolService.findOne(payload.school);
      if (!school_)
        throw new NotFoundException(
          'School with id "' + payload.school + '" not found',
        );
    }
    if (payload.code) {
      const subjectWithcode_ = await this.subjectModel
        .findOne({ code: payload.code })
        .exec();
      if (subjectWithcode_)
        throw new BadRequestException(
          'Subject with code "' + payload.code + '" already exists',
        );
    }
    const s = new this.subjectModel(payload);
    const saved = await s.save();
    const obj = (saved as any).toObject ? (saved as any).toObject() : saved;
    // include frontend-friendly fields
    obj.subjectName = obj.name;
    obj.subjectCode = obj.code;
    return obj;
  }

  async listSubjects(filter: any = {}) {
    return this.subjectModel.find(filter).exec();
  }


    async findAll(query: QuerySubjectDto) {
      const {
        q,
        // location,
        // contactEmail,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        order = 'desc',
      } = query;
  
      const filter: FilterQuery<Subject> = {};
      // if (location) filter.location = location;
      // if (contactEmail) filter.contactEmail = contactEmail.toLowerCase();
      if (q) {
        const regex = new RegExp(q, 'i');
        filter.$or = [
          { name: regex },
          { location: regex },
          { address: regex },
          { contactEmail: regex },
        ];
      }
  
      const skip = (page - 1) * limit;
      const sort: Record<string, 1 | -1> = { [sortBy]: order === 'asc' ? 1 : -1 };
  
      const [items, total] = await Promise.all([
        this.subjectModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
        this.subjectModel.countDocuments(filter).exec(),
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

  getSubjectById(id: string) {
    return this.subjectModel.findById(id).exec();
  }

  async updateSubject(id: string, dto: UpdateSubjectDto) {
    try {
      let subject_ = await this.subjectModel.findById(id).exec();
      if (!subject_)
        throw new NotFoundException('Subject with id "' + id + '" not found');
      // normalize incoming dto fields to schema fields
      const payload: any = { ...dto } as any;
      if ((dto as any).subjectName) {
        payload.name = (dto as any).subjectName;
        delete payload.subjectName;
      }
      if ((dto as any).subjectCode) {
        payload.code = (dto as any).subjectCode;
        delete payload.subjectCode;
      }
      if ((dto as any).category) {
        payload.subjectType = (dto as any).category;
        delete payload.category;
      }
      if ((dto as any).gradeLevel && !(dto as any).gradeLevels) {
        payload.gradeLevels = [(dto as any).gradeLevel];
        delete payload.gradeLevel;
      }

      if (payload.code) {
        try {
          const subjectWithcode_ = await this.findSubjectByCode(payload.code);
          // if (subjectWithcode_ && subjectWithcode_._id.toString() !== id) {
            // throw new BadRequestException(
            //   'Subject with code "' + payload.code + '" already exists',
            // );
          // }
        } catch (err) {
          // findSubjectByCode throws if not found, ignore that
          if (!(err instanceof NotFoundException)) throw err;
        }
      }
      if (payload.school) {
        const school_ = await this.schoolService.findOne(payload.school);
        if (!school_)
          throw new NotFoundException(
            'School with id "' + payload.school + '" not found',
          );
      }
      const updated = await this.subjectModel
        .findByIdAndUpdate(id, payload, { new: true })
        .exec();
      const obj = (updated as any)?.toObject
        ? (updated as any).toObject()
        : updated;
      if (obj) {
        obj.subjectName = obj.name;
        obj.subjectCode = obj.code;
      }
      return obj;
    } catch (error) {
      throw error;
    }
  }

  async findSubjectByCode(code?: string): Promise<Subject> {
    let _sub = await this.subjectModel.findOne({ code }).exec();
    if (_sub) return _sub;
    throw new NotFoundException('Subject with code "' + code + '" not found');
  }

  async deleteSubject(id: string) {
    return this.subjectModel.findByIdAndDelete(id).exec();
  }
}
