import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Role, User, UserDocument } from 'src/users/schemas/user.schema';
import { School } from 'src/school/entities/school.entity';
import { Teacher, TeacherDocument } from 'src/teachers/schemas/teacher.schema';
import { UsersService } from 'src/users/users.service';

interface SeedUser {
  email: string;
  name: string;
  role: Role;
  passwordRaw: string;
}

@Injectable()
export class SeederService {
  constructor(
    @InjectModel(School.name) private schoolModel: Model<School>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
    private userService: UsersService,
  ) {}

  /** --------------------------------------------------------------
   *  1. Seed a school + its admin (called once at startup)
   *  -------------------------------------------------------------- */
  async seedSchoolAndAdmin(): Promise<void> {
    // ---- 2. Ensure the admin user exists -------------------------------
    const adminData: SeedUser = {
      email: 'theodufi.rw@gmail.com',
      name: 'Super Admin',
      role: Role.ADMIN,
      passwordRaw: 'Secret@123',
    };

    let admin = await this.userModel.findOne({ email: adminData.email });

    if (!admin) {
      const hashed = await bcrypt.hash(adminData.passwordRaw, 10);
      admin = new this.userModel({
        email: adminData.email,
        password: hashed,
        name: adminData.name,
        role: adminData.role,
      });
      await admin.save();
      console.log('Admin user created:', admin.email);
    }

  }

  async seedAllUsers(): Promise<void> {
    // First make sure the school exists (so other users can reference it)
    await this.seedSchoolAndAdmin();
  }
}
