import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { EmailService } from '../auth/email.service';
import { Role, User } from '../users/schemas/user.schema';
import { UpdateHeadTeacherDto } from './dto/update-head-teacher.dto';
import { CreateHeadTeacherDto } from './dto/create-head-teacher.dto';
import { QueryHeadTeacherDto } from './dto/query-head-teacher.dto';

@Injectable()
export class HeadTeachersService {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
  ) {}

  async create(createTeacherDto: CreateHeadTeacherDto) {
    const teacher = await this.usersService.createUser({
      ...createTeacherDto,
      role: Role.HEADTeacher,
    });

    this.sendWelcomeEmailSafely(teacher);
    return teacher;
  }

  async findAll(query: QueryHeadTeacherDto) {
    return this.usersService.findAll({
      ...query,
      role: Role.HEADTeacher,
    });
  }

  async findOne(id: string) {
    return this.ensureTeacher(id);
  }

  async update(id: string, updateTeacherDto: UpdateHeadTeacherDto) {
    await this.ensureTeacher(id);
    return this.usersService.update(id, {
      ...updateTeacherDto,
      role: Role.HEADTeacher,
    });
  }

  async remove(id: string) {
    await this.ensureTeacher(id);
    return this.usersService.remove(id);
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


