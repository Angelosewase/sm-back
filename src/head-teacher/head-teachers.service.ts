import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { EmailService } from '../auth/email.service';
import { Role, User } from '../users/schemas/user.schema';
import { UpdateHeadTeacherDto } from './dto/update-head-teacher.dto';
import { CreateHeadTeacherDto } from './dto/create-head-teacher.dto';
import { QueryHeadTeacherDto } from './dto/query-head-teacher.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HeadTeacher, HeadTeacherDocument } from './schemas/head-teacher-schema';

@Injectable()
export class HeadTeachersService {

constructor(
    @InjectModel(HeadTeacher.name) private headTeacherModel: Model<HeadTeacherDocument>,
    private usersService: UsersService,
    private emailService: EmailService,
  ) {}

  async create(createHeadTeacherDto: CreateHeadTeacherDto): Promise<HeadTeacher> {
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
      subjects: createHeadTeacherDto.subjects?.map(id => new Types.ObjectId(id)),
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
    return headTeacher.save();
  }

  async findAll(query: QueryHeadTeacherDto): Promise<HeadTeacher[]> {
    return this.headTeacherModel.find().populate('user subjects school').exec();
  }

  async findOne(id: string): Promise<HeadTeacher> {
    const headTeacher = await this.headTeacherModel.findById(id).populate('user subjects school').exec();
    if (!headTeacher) throw new NotFoundException('Head Teacher not found');
    return headTeacher;
  }

  async update(id: string, updateHeadTeacherDto: UpdateHeadTeacherDto): Promise<HeadTeacher | null> {
    const headTeacher = await this.findOne(id);
    // Update user if needed
    if (updateHeadTeacherDto.phone || updateHeadTeacherDto.experience) {
      await this.usersService.update(headTeacher.user.toString(), {
        phone: updateHeadTeacherDto.phone,
        experience: updateHeadTeacherDto.experience,
      });
    }
    // Update head teacher fields
    return this.headTeacherModel.findByIdAndUpdate(id, {
      ...updateHeadTeacherDto,
      subjects: updateHeadTeacherDto.subjects?.map(id => new Types.ObjectId(id)),
    }, { new: true }).exec();
  }

  async delete(id: string): Promise<HeadTeacher | null> {
    const headTeacher = await this.findOne(id);
    await this.usersService.remove(headTeacher.user.toString());
    return this.headTeacherModel.findByIdAndDelete(id).exec();
  }

  private async ensureTeacher(id: string): Promise<User> {
    const teacher = await this.usersService.findById(id);
    if (!teacher || teacher.role !== Role.HEADTeacher) {
      throw new NotFoundException('Head Teacher not found');
    }
    return teacher;
  }

  private async sendWelcomeEmailSafely(teacher: User) {
    try {
      await this.emailService.sendTeacherWelcomeEmail(
        teacher.email,
        (teacher as any)?.name,
      );
    } catch (error) {
      // Non-blocking email failure
      // eslint-disable-next-line no-console
      console.error('Failed to send head teacher welcome email', error);
    }
  }
}
