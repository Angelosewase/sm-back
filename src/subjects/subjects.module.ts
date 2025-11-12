import { forwardRef, Module } from '@nestjs/common';
import { SubjectController } from './subject.controller';
import { SubjectService } from './subject.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Subject, SubjectSchema } from './schemas/subject.schema';
import { UsersModule } from 'src/users/users.module';

import { ClassesModule } from 'src/classes/classes.module';
import { Teacher, TeacherSchema } from 'src/teachers/schemas/teacher.schema';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { Class, ClassSchema } from 'src/classes/schemas/class.schema';
import { SchoolModule } from 'src/school/school.module';
import { Marks, MarksSchema } from 'src/marks/schemas/marks.schema';
import { Assessment, AssessmentSchema } from 'src/assessments/schemas/assessment-schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subject.name, schema: SubjectSchema },
      { name: Teacher.name, schema: TeacherSchema },
      { name: User.name, schema: UserSchema },
      { name: Class.name, schema: ClassSchema },
      { name: Marks.name, schema: MarksSchema },
      { name:Assessment.name, schema:AssessmentSchema },
    ]),
    UsersModule,
    forwardRef(() => SchoolModule),
    forwardRef(() => ClassesModule),
  ],
  controllers: [SubjectController],
  providers: [SubjectService],
  exports: [SubjectService],
})
export class SubjectsModule {}
