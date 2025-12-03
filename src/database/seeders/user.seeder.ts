import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Role, User } from 'src/users/schemas/user.schema';

interface SeedUser {
  email: string;
  name: string;
  role: Role;
  passwordRaw: string;
}

@Injectable()
export class SeederService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}
  async seedSuperAdmin(): Promise<void> {
    const adminData: SeedUser = {
      email: 'sewasejo8@gmail.com',
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
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
    await this.seedSuperAdmin();
  }
}
