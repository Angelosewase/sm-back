import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { EmailService } from '../auth/email.service';
import { Role, User } from '../users/schemas/user.schema';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { QueryTeacherDto } from './dto/query-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

@Injectable()
export class TeachersService {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
  ) {}

  async create(createTeacherDto: CreateTeacherDto) {
    const teacher = await this.usersService.createUser({
      ...createTeacherDto,
      role: Role.TEACHER,
    });

    this.sendWelcomeEmailSafely(teacher);
    return teacher;
  }

  async findAll(query: QueryTeacherDto) {
    return this.usersService.findAll({
      ...query,
      role: Role.TEACHER,
    });
  }

  async findOne(id: string) {
    return this.ensureTeacher(id);
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto) {
    await this.ensureTeacher(id);
    return this.usersService.update(id, {
      ...updateTeacherDto,
      role: Role.TEACHER,
    });
  }

  async remove(id: string) {
    await this.ensureTeacher(id);
    return this.usersService.remove(id);
  }

  private async ensureTeacher(id: string): Promise<User> {
    const teacher = await this.usersService.findById(id);
    if (!teacher || teacher.role !== Role.TEACHER) {
      throw new NotFoundException('Teacher not found');
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
      console.error('Failed to send teacher welcome email', error);
    }
  }
}


