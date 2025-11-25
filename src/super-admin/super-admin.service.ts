import { Injectable, NotFoundException } from '@nestjs/common';
import { SchoolService } from '../school/school.service';
import { UsersService } from '../users/users.service';
import { QuerySchoolsDto } from './dto/query-schools.dto';
import { QueryUserDto } from '../users/dto/query-user.dto';
import { School } from '../school/entities/school.entity';
import { Model, FilterQuery } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly schoolService: SchoolService,
    private readonly usersService: UsersService,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
  ) {}

  /**
   * Get all schools with optional filtering and pagination
   */
  async getAllSchools(query: QuerySchoolsDto) {
    const {
      q,
      isActive,
      city,
      district,
      page = 1,
      limit = 10,
      sortBy = 'name',
      order = 'asc',
    } = query;

    const filter: FilterQuery<School> = {};

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    if (city) {
      filter.city = new RegExp(city, 'i');
    }

    if (district) {
      filter.district = new RegExp(district, 'i');
    }

    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { name: regex },
        { city: regex },
        { district: regex },
        { email: regex },
      ];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: order === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.schoolModel
        .find(filter)
        .populate('users', 'name email role')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
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

  /**
   * Get detailed school information by ID
   */
  async getSchoolDetails(id: string): Promise<School> {
    const school = await this.schoolModel
      .findById(id)
      .populate('users', 'name email role phone avatar')
      .exec();

    if (!school) {
      throw new NotFoundException(`School with id "${id}" not found`);
    }

    return school;
  }

  /**
   * Activate a school
   */
  async activateSchool(id: string): Promise<School> {
    return this.schoolService.activate(id);
  }

  /**
   * Deactivate a school
   */
  async deactivateSchool(id: string): Promise<School> {
    return this.schoolService.deactivate(id);
  }

  /**
   * Get all users with optional filtering, search, and pagination
   */
  async getAllUsers(query: QueryUserDto) {
    return this.usersService.findAll(query);
  }
}

