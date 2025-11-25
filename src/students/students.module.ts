import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Student, StudentSchema } from './schemas/student.schema';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { Class, ClassSchema } from '../classes/schemas/class.schema';
import { Teacher, TeacherSchema } from 'src/teachers/schemas/teacher.schema';
import { Marks, MarksSchema } from 'src/marks/schemas/marks.schema';
import {
  Assessment,
  AssessmentSchema,
} from 'src/assessments/schemas/assessment-schema';
import { Subject, SubjectSchema } from 'src/subjects/schemas/subject.schema';
import { StudentPerformanceController } from './student-performance.controller';
import { StudentPerformanceService } from './student-performance.service';
import { AcademicYear, AcademicYearSchema } from 'src/academic-year/schemas/academic-year.schema';
import { Term, TermSchema } from 'src/terms/schemas/term.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: Class.name, schema: ClassSchema },
      { name: Teacher.name, schema: TeacherSchema },
      { name: Marks.name, schema: MarksSchema },
      { name: Assessment.name, schema: AssessmentSchema },
      { name: Subject.name, schema: SubjectSchema },
      { name: AcademicYear.name, schema: AcademicYearSchema },
      { name: Term.name, schema: TermSchema },
    ]),
  ],
  controllers: [StudentController, StudentPerformanceController],
  providers: [StudentService, StudentPerformanceService],
  exports: [StudentService, StudentPerformanceService],
})
export class StudentsModule {}
