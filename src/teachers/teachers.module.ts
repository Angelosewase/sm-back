import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { Teacher, TeacherSchema } from './schemas/teacher.schema';
import { Class, ClassSchema } from 'src/classes/schemas/class.schema';
import {
  Subject,
  SubjectSchema,
} from 'src/subjects/schemas/subject.schema';
import {
  SubjectAssignment,
  SubjectAssignmentSchema,
} from 'src/subjects/schemas/subject-assignment.schema';

@Module({
  imports: [UsersModule, AuthModule,
    MongooseModule.forFeature([
      {name: Teacher.name, schema: TeacherSchema},
      {name: Class.name, schema: ClassSchema},
      {name: Subject.name, schema: SubjectSchema},
      {name: SubjectAssignment.name, schema: SubjectAssignmentSchema},
    ])
  ],
  controllers: [TeachersController],
  providers: [TeachersService],
})
export class TeachersModule {}


