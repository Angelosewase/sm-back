import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { EmailService } from '../auth/email.service';
import { Role, User } from '../users/schemas/user.schema';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { QueryTeacherDto } from './dto/query-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class TeachersService {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
  ) {}

  async create(createTeacherDto: CreateTeacherDto) {
    const temporaryPassword = this.generateTemporaryPassword();
    const teacher = await this.usersService.createUser({
      ...createTeacherDto,
      password: temporaryPassword,
      role: Role.TEACHER,
    });

    this.sendWelcomeEmailSafely(teacher, temporaryPassword);

    const teacherData =
      typeof (teacher as any).toObject === 'function'
        ? (teacher as any).toObject()
        : (teacher as any);

    return {
      ...teacherData,
      temporaryPassword,
    };
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
    const updatePayload: Parameters<
      typeof this.usersService.update
    >[1] = {
      ...updateTeacherDto,
      role: Role.TEACHER,
    };

    return this.usersService.update(id, updatePayload);
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

  private async sendWelcomeEmailSafely(teacher: User, temporaryPassword: string) {
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

  private generateTemporaryPassword(): string {
    return randomBytes(9)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 12);
  }
}


