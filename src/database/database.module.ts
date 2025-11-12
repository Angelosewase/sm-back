import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeederService } from './seeders/user.seeder';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  HeadTeacher,
  HeadTeacherSchema,
} from 'src/head-teacher/schemas/head-teacher-schema';
import { HeadTeachersModule } from 'src/head-teacher/head-teachers.module';
import { School, SchoolSchema } from 'src/school/entities/school.entity';
import { UsersModule } from 'src/users/users.module';
import { Teacher, TeacherSchema } from 'src/teachers/schemas/teacher.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
      { name: HeadTeacher.name, schema: HeadTeacherSchema },
      { name: Teacher.name, schema: TeacherSchema },
    ]),
    UsersModule,
    HeadTeachersModule,
  ],
  providers: [SeederService],
  exports: [SeederService],
})
export class DatabaseModule {}
