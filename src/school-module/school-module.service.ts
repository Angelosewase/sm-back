import { Injectable } from '@nestjs/common';
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

  constructor(@InjectModel(School.name) private readonly schoolModel: Model<School>) {}

  async create(createSchoolModuleDto: CreateSchoolModuleDto) {
    const created = await this.schoolModel.create(createSchoolModuleDto);
    return created;
  }

  async findAll(query: QuerySchoolDto) {
    const { q, location, contactEmail, page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = query;

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
    return { items, total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
  }

  async findOne(id: string) {
    return this.schoolModel.findById(id).exec();
  }

  async update(id: string, updateSchoolModuleDto: UpdateSchoolModuleDto) {
    return this.schoolModel
      .findByIdAndUpdate(id, { $set: updateSchoolModuleDto }, { new: true, runValidators: true })
      .exec();
  }

  async remove(id: string) {
    await this.schoolModel.findByIdAndDelete(id).exec();
    return { deleted: true };
  }
}
