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
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { Assessment, AssessmentSchema } from 'src/assessments/schemas/assessment-schema';

@Module({
  imports: [UsersModule, AuthModule,
    MongooseModule.forFeature([
      {name: Teacher.name, schema: TeacherSchema},
      {name: User.name, schema: UserSchema},
      {name: Class.name, schema: ClassSchema},
      {name: Subject.name, schema: SubjectSchema},
      {name: SubjectAssignment.name, schema: SubjectAssignmentSchema},
      {name: Assessment.name, schema: AssessmentSchema},
    ])
  ],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}


