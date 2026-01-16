import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { Class, ClassSchema } from './schemas/class.schema';
import { Teacher, TeacherSchema } from '../teachers/schemas/teacher.schema';
import { UsersModule } from '../users/users.module';
import { SubjectsModule } from 'src/subjects/subjects.module';
import { TeachersModule } from 'src/teachers/teachers.module';
import { SchoolModule } from 'src/school/school.module';
import { AssessmentModule } from 'src/assessments/assessment.module';
import { MarksModule } from 'src/marks/marks.module';
import { StudentsModule } from 'src/students/students.module';
import { Marks, MarksSchema } from 'src/marks/schemas/marks.schema';
import { Student, StudentSchema } from 'src/students/schemas/student.schema';
import { Assessment, AssessmentSchema } from 'src/assessments/schemas/assessment-schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Class.name, schema: ClassSchema },
      { name: Teacher.name, schema: TeacherSchema },
      { name: Student.name, schema: StudentSchema },
      { name: Marks.name, schema: MarksSchema },
      { name: Assessment.name, schema: AssessmentSchema },
    ]),
    UsersModule,
    TeachersModule,
    forwardRef(()=> SubjectsModule),
    SchoolModule,
    StudentsModule,
    forwardRef(()=> MarksModule),
    AssessmentModule,
  ],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
