import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, Role } from '../../users/schemas/user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserSeeder {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async seed() {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      email: 'sewasejo8@gmail.com',
    });

    if (existingUser) {
      console.log('User already exists, skipping seed');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('Hello@123', 10);

    // Create user
    const user = new this.userModel({
      email: 'sewasejo8@gmail.com',
      password: hashedPassword,
      name: 'Test User',
      role: Role.ADMIN,
    });

    await user.save();
    console.log('✅ User seeded successfully');
    console.log('Email: sewasejo8@gmail.com');
    console.log('Password: Hello@123');
  }
}
