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
    // Hash password
    const hashedPassword = await bcrypt.hash('Hello@123', 10);

    if (existingUser) {
      console.log('User already exists, skipping seed');
      return;
    }

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

  async seed2() {
    const existingUser2 = await this.userModel.findOne({
      email: 'theodufi.rw@gmail.com',
    });

    if (existingUser2) {
      console.log('User 2 already exists, skipping seed');
      return;
    }

    const hashedPassword = await bcrypt.hash('Hello@123', 10);

    const user2 = new this.userModel({
      email: 'theodufi.rw@gmail.com',
      password: hashedPassword,
      name: 'Theodore',
      role: Role.ADMIN,
    });

    await user2.save();
    console.log('✅ User seeded successfully');
    console.log('Email: theodufi.rw@gmail.cobnm');
    console.log('Password: Hello@123');
  }
}
