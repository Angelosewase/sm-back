import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { School } from './entities/school.entity';

@Injectable()
export class SchoolService {
  constructor(
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
  ) {}

  async create(createSchoolDto: CreateSchoolDto): Promise<School> {
    try {
      const school = new this.schoolModel(createSchoolDto);
      return await school.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          'A school with the provided unique details already exists',
        );
      }
      throw error;
    }
  }

  async findAll(): Promise<School[]> {
    return this.schoolModel.find().sort({ name: 1 }).exec();
  }

  async findOne(id: string): Promise<School> {
    this.validateObjectId(id);
    const school = await this.schoolModel.findById(id).exec();

    if (!school) {
      throw new NotFoundException(`School with id "${id}" not found`);
    }

    return school;
  }

  async update(id: string, updateSchoolDto: UpdateSchoolDto): Promise<School> {
    this.validateObjectId(id);

    try {
      const updatedSchool = await this.schoolModel
        .findByIdAndUpdate(
          id,
          { $set: updateSchoolDto },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updatedSchool) {
        throw new NotFoundException(`School with id "${id}" not found`);
      }

      return updatedSchool;
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          'A school with the provided unique details already exists',
        );
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    this.validateObjectId(id);
    const deleted = await this.schoolModel.findByIdAndDelete(id).exec();

    if (!deleted) {
      throw new NotFoundException(`School with id "${id}" not found`);
    }
  }

  private validateObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid school id "${id}"`);
    }
  }
}
