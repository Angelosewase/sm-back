import { forwardRef, Module } from '@nestjs/common';
import { SubjectController } from './subject.controller';
import { SubjectService } from './subject.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Subject, SubjectSchema } from './schemas/subject.schema';
import {
  SubjectAssignment,
  SubjectAssignmentSchema,
} from './schemas/subject-assignment.schema';
import { UsersModule } from 'src/users/users.module';

import { ClassesModule } from 'src/classes/classes.module';
import { SchoolModule } from 'src/school/school.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subject.name, schema: SubjectSchema },
      { name: SubjectAssignment.name, schema: SubjectAssignmentSchema },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => SchoolModule),
    forwardRef(() => ClassesModule),
  ],
  controllers: [SubjectController],
  providers: [SubjectService],
  exports: [SubjectService],
})
export class SubjectsModule {}
