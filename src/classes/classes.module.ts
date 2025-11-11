import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { Class, ClassSchema } from './schemas/class.schema';
import { Teacher, TeacherSchema } from '../teachers/schemas/teacher.schema';
import {
  SubjectAssignment,
  SubjectAssignmentSchema,
} from '../subjects/schemas/subject-assignment.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Class.name, schema: ClassSchema },
      { name: Teacher.name, schema: TeacherSchema },
      { name: SubjectAssignment.name, schema: SubjectAssignmentSchema },
    ]),
    UsersModule,
  ],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
