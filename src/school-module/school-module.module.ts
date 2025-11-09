import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Subject, SubjectSchema } from '../subjects/schemas/subject.schema';
import { Student, StudentSchema } from './schemas/student.schema';
import { Enrollment, EnrollmentSchema } from './schemas/enrollment.schema';
import {
  SubjectAssignment,
  SubjectAssignmentSchema,
} from '../subjects/schemas/subject-assignment.schema';
import { Marks, MarksSchema } from './schemas/marks.schema';
import {
  AcademicYear,
  AcademicYearSchema,
} from './schemas/academic-year.schema';
import { Term, TermSchema } from './schemas/term.schema';
import { Teacher, TeacherSchema } from './schemas/teacher.schema';
import { MarksController } from './controllers/marks.controller';
import { ReportsController } from './controllers/reports.controller';
import { StudentController } from './controllers/student.controller';
import { AuditLog, AuditLogSchema } from './schemas/audit.schema';
import { EnrollmentService } from './services/enrollment.service';
import { MarksService } from './services/marks.service';
import { StudentService } from './services/student.service';
import { CsvImportService } from './services/csv-import.service';
import { PdfService } from './services/pdf.service';
import { SchoolModuleController } from './school-module.controller';
import { SchoolModuleService } from './school-module.service';
import { School, SchoolSchema } from './schemas/school.schema';
import { UsersModule } from 'src/users/users.module';
import { SubjectsModule } from 'src/subjects/subjects.module';
import { ClassesModule } from 'src/classes/classes.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: SubjectAssignment.name, schema: SubjectAssignmentSchema },
      { name: Marks.name, schema: MarksSchema },
      { name: AcademicYear.name, schema: AcademicYearSchema },
      { name: Term.name, schema: TermSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: School.name, schema: SchoolSchema },
      { name: Subject.name, schema: SubjectSchema },
    ]),
    UsersModule,
    SubjectsModule,
    ClassesModule,
  ],
  providers: [
    StudentService,
    MarksService,
    EnrollmentService,
    CsvImportService,
    PdfService,
    SchoolModuleService,
  ],
  controllers: [
    StudentController,
    MarksController,
    ReportsController,
    SchoolModuleController,
  ],
  exports: [
    StudentService,
    MarksService,
    EnrollmentService,
    CsvImportService,
    PdfService,
    SchoolModuleService,
  ],
})
export class SchoolModule {}
