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
    console.log('--- Starting School + Admin Seeding ---');

    // ---- 1. Ensure the school exists ---------------------------------
    const schoolData = {
      name: 'Demo Academy',
      schoolType: 'Secondary',
      establishedYear: 2012,
      studentCapacity: 800,
      description:
        'Demo Academy is a top-tier secondary school focused on academic excellence and holistic development.',
      address: '123 Main Street, Kigali, Rwanda',
      city: 'Kigali',
      district: 'Gasabo',
      phoneNumber: '+250 788 123 456',
      email: 'info@demoacademy.rw', // Ensure this is unique across your db
      website: 'https://www.demoacademy.rw',
      users: [], // Optionally, you can leave this out; it's handled by population logic
    };

    let school = await this.schoolModel.findOne({
      email: schoolData.email,
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
        school: school._id, // <-- link to school
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

    const createTeacherDto = {
      teacherId: 'TCH001',
      name: 'Dr. Alice Mukandori',
      email: 'alice.mukandori@school.rw',
      password: 'Secret@123',
      phone: '+250788123456',
      experience: 8,
      subjectsCanTeach: [],
      department: 'Science Department',
      assignedClasses: ['507f1f77bcf86cd799439013'], // Grade 10A
      qualification: 'PhD in Mathematics Education',
      hireDate: '2020-01-15',
      status: 'Active',
      address: '45 KG 15 Ave',
      city: 'Kigali',
      state: 'Kigali City',
      zip: '00100',
      emergencyContact: 'Peter Mukandori - +250788654321',
      notes: 'Experienced in IB curriculum, specializes in calculus',
    };

    const allUsers: SeedUser[] = [
      // admin is already seeded above – we keep it here only for completeness
      {
        email: 'admin@app.com',
        name: 'Super Admin',
        role: Role.ADMIN,
        passwordRaw: 'Secret@123',
      },

      {
        email: 'teacher@app.com',
        name: 'Prof. Example',
        role: Role.TEACHER,
        passwordRaw: 'Secret@123',
      },
      // { email: 'student@app.com', name: 'Student Learner', role: Role.STUDENT, passwordRaw: 'Secret@123' },
      {
        email: 'headteacher@app.com',
        name: 'Head Teacher',
        role: Role.HEADTeacher,
        passwordRaw: 'Secret@123',
      },
      // { email: 'staff@app.com', name: 'Office Staff', role: Role.STAFF, passwordRaw: 'Secret@123' },
    ];

    console.log('--- Starting Remaining Users Seeding ---');

    // Grab the school we created above
    const school = await this.schoolModel.findOne({
      email: 'info@demoacademy.rw',
    });

    const userDto = {
      email: createTeacherDto.email,
      password: createTeacherDto.password,
      name: createTeacherDto.name,
      phone: createTeacherDto.phone,
      experience: createTeacherDto.experience,
      role: Role.TEACHER,
      school: (school as any)._id,
    };
    const user_ = await this.userModel.findOne({ email: userDto.email });
    if (user_) {
      console.log(
        `User ${userDto.email} already exists, skipping teacher creation.`,
      );
    } else {
     const user = await this.userService.createUser(userDto);
      // Create teacher document
      const teacher = new this.teacherModel({
        user: (user as any)._id,
        teacherId: createTeacherDto.teacherId,
        department: createTeacherDto.department,
        assignedClasses: createTeacherDto.assignedClasses?.map(
          (id) => new Types.ObjectId(id),
        ),
        phone: createTeacherDto.phone, // Override if needed
        qualification: createTeacherDto.qualification,
        hireDate: createTeacherDto.hireDate,
        school: new Types.ObjectId((school as any)._id as string),
        status: createTeacherDto.status,
        address: createTeacherDto.address,
        city: createTeacherDto.city,
        state: createTeacherDto.state,
        zip: createTeacherDto.zip,
        emergencyContact: createTeacherDto.emergencyContact,
        notes: createTeacherDto.notes,
      });

      await teacher.save();
      console.log(`Teacher document created for ${userDto.email}`);
    }
    for (const userData of allUsers) {
      const existing = await this.userModel.findOne({ email: userData.email });
      if (existing) {
        console.log(
          `User ${userData.email} (${userData.role}) already exists, skipping.`,
        );
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
          school:
            userData.role !== Role.ADMIN ? (school as any)._id : undefined,
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
