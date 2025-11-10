import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { EmailService } from '../auth/email.service';
import { Role, User } from '../users/schemas/user.schema';
import { UpdateHeadTeacherDto } from './dto/update-head-teacher.dto';
import { CreateHeadTeacherDto } from './dto/create-head-teacher.dto';
import { QueryHeadTeacherDto } from './dto/query-head-teacher.dto';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  HeadTeacher,
  HeadTeacherDocument,
} from './schemas/head-teacher-schema';
import { randomBytes } from 'crypto';

@Injectable()
export class HeadTeachersService {
  constructor(
    @InjectModel(HeadTeacher.name)
    private headTeacherModel: Model<HeadTeacherDocument>,
    private usersService: UsersService,
    private emailService: EmailService,
  ) {}

  async create(
    createHeadTeacherDto: CreateHeadTeacherDto,
  ): Promise<HeadTeacher> {
    // Validation: Only one head teacher per school
    const schoolId = createHeadTeacherDto.school;
    const existingHeadTeacher = await this.headTeacherModel.findOne({
      school: new Types.ObjectId(schoolId),
    });
    if (existingHeadTeacher) {
      throw new BadRequestException('This school already has a head teacher.');
    }

    // Validation: Only one school per head teacher (by user email)
    const existingUser = await this.usersService.findByEmail(
      createHeadTeacherDto.email,
    );
    if (existingUser) {
      const alreadyHeadTeacher = await this.headTeacherModel.findOne({
        user: existingUser._id,
      });
      if (alreadyHeadTeacher) {
        throw new Error('This head teacher already belongs to a school.');
      }
    }

    const temporaryPassword = this.generateTemporaryPassword();
    // Create user with role HEADTeacher
    const userDto = {
      email: createHeadTeacherDto.email,
      password: createHeadTeacherDto.password,
      name: createHeadTeacherDto.name,
      phone: createHeadTeacherDto.phone,
      experience: createHeadTeacherDto.experience,
      role: Role.HEADTeacher,
      school: createHeadTeacherDto.school,
    };
    const user = await this.usersService.createUser(userDto);

    // Create head teacher document
    const headTeacher = new this.headTeacherModel({
      user: user._id,
      headTeacherId: createHeadTeacherDto.headTeacherId,
      department: createHeadTeacherDto.department,
      phone: createHeadTeacherDto.phone,
      qualification: createHeadTeacherDto.qualification,
      hireDate: createHeadTeacherDto.hireDate,
      school: new Types.ObjectId(createHeadTeacherDto.school),
      status: createHeadTeacherDto.status,
      address: createHeadTeacherDto.address,
      city: createHeadTeacherDto.city,
      state: createHeadTeacherDto.state,
      zip: createHeadTeacherDto.zip,
      emergencyContact: createHeadTeacherDto.emergencyContact,
      notes: createHeadTeacherDto.notes,
    });

    this.sendWelcomeEmailSafely(user, temporaryPassword);

    return headTeacher.save();
  }

  async findAll(query: QueryHeadTeacherDto) {
    const {
      q,
      email,
      school,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    const filter: FilterQuery<HeadTeacher> = {};
    if (email) filter.email = email.toLowerCase();
    if (school) filter.school = school;
    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: order === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.headTeacherModel
        .find(filter)
        .populate('user school')
        .select('-password -__v')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.headTeacherModel.countDocuments(filter).exec(),
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

  async findOne(id: string): Promise<HeadTeacher> {
    const headTeacher = await this.headTeacherModel
      .findById(id)
      .populate('user school')
      .exec();
    if (!headTeacher) throw new NotFoundException('Head Teacher not found');
    return headTeacher;
  }

  async update(
    id: string,
    updateHeadTeacherDto: UpdateHeadTeacherDto,
  ): Promise<HeadTeacher | null> {
    const headTeacher = await this.findOne(id);
    // Update user if needed
    if (updateHeadTeacherDto.phone || updateHeadTeacherDto.experience) {
      await this.usersService.update(headTeacher.user.toString(), {
        phone: updateHeadTeacherDto.phone,
        experience: updateHeadTeacherDto.experience,
      });
    }
    // Update head teacher fields
    return this.headTeacherModel
      .findByIdAndUpdate(
        id,
        {
          ...updateHeadTeacherDto,
          subjects: updateHeadTeacherDto.subjects?.map(
            (id) => new Types.ObjectId(id),
          ),
        },
        { new: true },
      )
      .exec();
  }

  private generateTemporaryPassword(): string {
    return randomBytes(9)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 12);
  }

  async delete(id: string): Promise<HeadTeacher | null> {
    const headTeacher = await this.findOne(id);
    await this.usersService.remove(headTeacher.user.toString());
    return this.headTeacherModel.findByIdAndDelete(id).exec();
  }

  private async ensureHeadTeacher(id: string): Promise<User> {
    const teacher = await this.usersService.findById(id);
    if (!teacher || teacher.role !== Role.HEADTeacher) {
      throw new NotFoundException('Head Teacher not found');
    }
    return teacher;
  }

  private async sendWelcomeEmailSafely(
    teacher: User,
    temporaryPassword: string,
  ) {
    try {
      await this.emailService.sendTeacherWelcomeEmail(
        teacher.email,
        temporaryPassword,
        (teacher as any)?.name,
      );
    } catch (error) {
      // Non-blocking email failure
      // eslint-disable-next-line no-console
      console.error('Failed to send teacher welcome email', error);
    }
  }
}
