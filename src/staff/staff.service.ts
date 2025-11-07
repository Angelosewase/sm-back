import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { EmailService } from '../auth/email.service';
import { Role, User } from '../users/schemas/user.schema';
import { CreateStaffDto } from './dto/create-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
  ) {}

  async create(createStaffDto: CreateStaffDto) {
    const staff = await this.usersService.createUser({
      ...createStaffDto,
      role: Role.STAFF,
    });

    this.sendWelcomeEmailSafely(staff);
    return staff;
  }

  async findAll(query: QueryStaffDto) {
    return this.usersService.findAll({
      ...query,
      role: Role.STAFF,
    });
  }

  async findOne(id: string) {
    return this.ensureStaff(id);
  }

  async update(id: string, updateStaffDto: UpdateStaffDto) {
    await this.ensureStaff(id);
    return this.usersService.update(id, {
      ...updateStaffDto,
      role: Role.STAFF,
    });
  }

  async remove(id: string) {
    await this.ensureStaff(id);
    return this.usersService.remove(id);
  }

  private async ensureStaff(id: string): Promise<User> {
    const staff = await this.usersService.findById(id);
    if (!staff || staff.role !== Role.STAFF) {
      throw new NotFoundException('Staff member not found');
    }
    return staff;
  }

  private async sendWelcomeEmailSafely(staff: User) {
    try {
      await this.emailService.sendStaffWelcomeEmail(
        staff.email,
        (staff as any)?.name,
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to send staff welcome email', error);
    }
  }
}


