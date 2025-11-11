import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Role, User, UserDocument } from 'src/users/schemas/user.schema';
import { School } from 'src/school/entities/school.entity';

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
  ) {}

  /** --------------------------------------------------------------
   *  1. Seed a school + its admin (called once at startup)
   *  -------------------------------------------------------------- */
  async seedSchoolAndAdmin(): Promise<void> {
    console.log('--- Starting School + Admin Seeding ---');

    // ---- 1. Ensure the school exists ---------------------------------
    const schoolData = {
      name: 'Demo Academy',
      location: 'Kigali',
      address: '123 Main Street, Kigali, Rwanda',
      contactPhone: '+250 788 123 456',
      contactEmail: 'info@demoacademy.rw',
    };

    let school = await this.schoolModel.findOne({
      contactEmail: schoolData.contactEmail,
    });

    if (!school) {
      school = new this.schoolModel(schoolData);
      await school.save();
      console.log('School created:', school.name);
    } else {
      console.log('School already exists, reusing:', school.name);
    }

    // ---- 2. Ensure the admin user exists -------------------------------
    const adminData: SeedUser = {
      email: 'admin@app.com',
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
        school: school._id,               // <-- link to school
      });
      await admin.save();
      console.log('Admin user created:', admin.email);
    } else {
      // If admin already exists but is not linked to the school, fix it
      if (!admin.school || !admin.school.equals((school as any)._id)) {
        admin.school = (school as any)._id;
        await admin.save();
        console.log('Admin linked to school');
      } else {
        console.log('Admin already exists and linked');
      }
    }

    // ---- 3. Add admin to school's `users` array -----------------------
    if (!school.users?.some((id) => id.equals((admin as any)._id))) {
      school.users = [...(school.users || []), (admin as any)._id];
      await school.save();
      console.log('Admin added to school.users array');
    }

    console.log('--- School + Admin Seeding Complete ---\n');
  }

  /** --------------------------------------------------------------
   *  2. Your existing user seeder – now uses the school for non-admins
   *  -------------------------------------------------------------- */
  async seedAllUsers(): Promise<void> {
    // First make sure the school exists (so other users can reference it)
    await this.seedSchoolAndAdmin();

    const allUsers: SeedUser[] = [
      // admin is already seeded above – we keep it here only for completeness
      { email: 'admin@app.com', name: 'Super Admin', role: Role.ADMIN, passwordRaw: 'Secret@123' },

      { email: 'teacher@app.com', name: 'Prof. Example', role: Role.TEACHER, passwordRaw: 'Secret@123' },
      // { email: 'student@app.com', name: 'Student Learner', role: Role.STUDENT, passwordRaw: 'Secret@123' },
      { email: 'headteacher@app.com', name: 'Head Teacher', role: Role.HEADTeacher, passwordRaw: 'Secret@123' },
      // { email: 'staff@app.com', name: 'Office Staff', role: Role.STAFF, passwordRaw: 'Secret@123' },
    ];

    console.log('--- Starting Remaining Users Seeding ---');

    // Grab the school we created above
    const school = await this.schoolModel.findOne({ contactEmail: 'info@demoacademy.rw' });

    for (const userData of allUsers) {
      const existing = await this.userModel.findOne({ email: userData.email });
      if (existing) {
        console.log(`User ${userData.email} (${userData.role}) already exists, skipping.`);
        continue;
      }

      try {
        const hashed = await bcrypt.hash(userData.passwordRaw, 10);

        const newUser = new this.userModel({
          email: userData.email,
          password: hashed,
          name: userData.name,
          role: userData.role,
          // Non-admin users belong to the demo school
          school: userData.role !== Role.ADMIN ? (school as any)._id : undefined,
        });

        await newUser.save();

        // Also push the user into the school's `users` array (except admin – already done)
        if (userData.role !== Role.ADMIN && school) {
          if (!school.users?.some((id) => id.equals((newUser as any)._id))) {
            school.users = [...(school.users || []), (newUser as any)._id];
            await school.save();
          }
        }

        console.log(`User seeded: ${userData.email} (${userData.role})`);
      } catch (err) {
        console.error(`Failed to seed ${userData.email}:`, err.message);
      }
    }

    console.log('--- Remaining Users Seeding Complete ---');
  }
}