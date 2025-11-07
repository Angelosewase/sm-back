import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, Role } from '../../users/schemas/user.schema';
import * as bcrypt from 'bcrypt';

interface SeedUser {
  email: string;
  name: string;
  role: string; // Use Role enum type if available
  passwordRaw: string;
}

@Injectable()
export class UserSeeder {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

/**
   * Seeds the database with all predefined users.
   */
  async seedAllUsers(): Promise<void> {
    const allUsers: SeedUser[] = [
     
        { email: 'admin@app.com', name: 'Super Admin', role: Role.ADMIN, passwordRaw: 'Secret@123' },
        { email: 'teacher@app.com', name: 'Prof. Example', role: Role.TEACHER, passwordRaw: 'Secret@123' },
        { email: 'student@app.com', name: 'Student Learner', role: Role.STUDENT, passwordRaw: 'Secret@123' },
        { email: 'headteacher@app.com', name: 'Head Teacher', role: Role.HEADTeacher, passwordRaw: 'Secret@123' },
        { email: 'staff@app.com', name: 'Office Staff', role: Role.STAFF, passwordRaw: 'Secret@123' },
    ];
    
    console.log('--- Starting User Seeding ---');
    
    for (const userData of allUsers) {
      // 1. Check if user already exists
      const existingUser = await this.userModel.findOne({ email: userData.email });

      if (existingUser) {
        console.log(`User ${userData.email} (${userData.role}) already exists, skipping.`);
        continue; // Skip to the next user
      }

      try {
        // 2. Hash password
        const hashedPassword = await bcrypt.hash(userData.passwordRaw, 10);

        // 3. Create and save user
        const newUser = new this.userModel({
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          role: userData.role,
        });

        await newUser.save();
        console.log(`✅ ${userData.role.toUpperCase()} User seeded: ${userData.email}`);
      } catch (error) {
        console.error(`❌ Failed to seed user ${userData.email}:`, error.message);
      }
    }
    
    console.log('--- User Seeding Complete ---');
  }
}
