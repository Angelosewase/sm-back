import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { CreateSchoolModuleDto } from './dto/create-school-module.dto';
import { UpdateSchoolModuleDto } from './dto/update-school-module.dto';
import { QuerySchoolDto } from './dto/query-school.dto';
import { School } from './schemas/school.schema';
import { User } from 'src/users/schemas/user.schema';
import { QueryUserDto } from 'src/users/dto/query-user.dto';

@Injectable()
export class SchoolModuleService {
  constructor(
    @InjectModel(School.name) private readonly schoolModel: Model<School>,
  ) {}

  async create(createSchoolModuleDto: CreateSchoolModuleDto): Promise<School> {
    try {
      const school_ = await this.schoolModel.findOne({
        $or: [
          { name: createSchoolModuleDto.name },
          { contactEmail: createSchoolModuleDto.contactEmail },
        ],
      });

      if (school_) {
        throw new ConflictException(
          'School with that name or email already exists',
        );
      }
      return await this.schoolModel.create(createSchoolModuleDto);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException(
          'Please check the school records some are invalid',
        );
      } else {
        throw new Error(error.message);
      }
    }
  }


    async findAll(query: QuerySchoolDto) {
    const {
      q,
      location,
      contactEmail,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    const filter: FilterQuery<School> = {};
    if (location) filter.location = location;
    if (contactEmail) filter.contactEmail = contactEmail.toLowerCase();
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
      this.schoolModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.schoolModel.countDocuments(filter).exec(),
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

  async findOne(id: string) {
    return this.schoolModel.findById(id).exec();
  }


  async update(id: string, updateSchoolModuleDto: UpdateSchoolModuleDto) {
    try {
      const school = await this.schoolModel.findById(id).exec();
      if (!school) {
        throw new BadRequestException('School with id "' + id + '" not found');
      }
      if(updateSchoolModuleDto.contactEmail){
        const school_ = await this.findSchoolByContactEmailOrName(updateSchoolModuleDto.contactEmail, updateSchoolModuleDto.name);
        if (school_ && school_.name !== school.name && school_.contactEmail !== school.contactEmail) {
          throw new ConflictException(
            'School with that email or name already exists please prefer another email or name',
          );
        }
      } 
          return this.schoolModel
      .findByIdAndUpdate(
        id,
        { $set: updateSchoolModuleDto },
        { new: true, runValidators: true },
      )
      .exec();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException(
          error.message,
        );
      } else if(error instanceof ConflictException) {
        throw new ConflictException(error.message);
      }
      else {
        throw new Error(error.message);
      }
    }
  }

  async remove(id: string) {
    await this.schoolModel.findByIdAndDelete(id).exec();
    return { deleted: true };
  }


  async findSchoolByContactEmailOrName(contactEmail?: string, name?: string) {
    return this.schoolModel.findOne({
      $or: [
        { name: name },
        { contactEmail: contactEmail },
      ],
    }).exec();
  }
}
