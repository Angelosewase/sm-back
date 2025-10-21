import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Class, ClassSchema } from './schemas/class.schema';
import { Subject, SubjectSchema } from './schemas/subject.schema';
import { Student, StudentSchema } from './schemas/student.schema';
import { Enrollment, EnrollmentSchema } from './schemas/enrollment.schema';
import {
  SubjectAssignment,
  SubjectAssignmentSchema,
} from './schemas/subject-assignment.schema';
import { Marks, MarksSchema } from './schemas/marks.schema';
import {
  AcademicYear,
  AcademicYearSchema,
} from './schemas/academic-year.schema';
import { Term, TermSchema } from './schemas/term.schema';
import { Teacher, TeacherSchema } from './schemas/teacher.schema';
import { ClassController } from './controllers/class.controller';
import { MarksController } from './controllers/marks.controller';
import { ReportsController } from './controllers/reports.controller';
import { StudentController } from './controllers/student.controller';
import { SubjectController } from './controllers/subject.controller';
import { AuditLog, AuditLogSchema } from './schemas/audit.schema';
import { ClassService } from './services/class.service';
import { EnrollmentService } from './services/enrollment.service';
import { MarksService } from './services/marks.service';
import { StudentService } from './services/student.service';
import { SubjectAssignmentService } from './services/subject-assignment.service';
import { SubjectService } from './services/subject.service';
import { CsvImportService } from './services/csv-import.service';
import { PdfService } from './services/pdf.service';
import { SchoolModuleController } from './school-module.controller';
import { SchoolModuleService } from './school-module.service';
import { School, SchoolSchema } from './schemas/school.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Class.name, schema: ClassSchema },
      { name: Subject.name, schema: SubjectSchema },
      { name: Student.name, schema: StudentSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: SubjectAssignment.name, schema: SubjectAssignmentSchema },
      { name: Marks.name, schema: MarksSchema },
      { name: AcademicYear.name, schema: AcademicYearSchema },
      { name: Term.name, schema: TermSchema },
      { name: Teacher.name, schema: TeacherSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: School.name, schema: SchoolSchema },
    ]),
  ],
  providers: [
    ClassService,
    SubjectService,
    StudentService,
    MarksService,
    EnrollmentService,
    SubjectAssignmentService,
    CsvImportService,
    PdfService,
    SchoolModuleService
  ],
  controllers: [
    ClassController,
    SubjectController,
    StudentController,
    MarksController,
    ReportsController,
    SchoolModuleController,
  ],
  exports: [
    ClassService,
    SubjectService,
    StudentService,
    MarksService,
    EnrollmentService,
    SubjectAssignmentService,
    CsvImportService,
    PdfService,
    SchoolModuleService
  ],
})
export class SchoolModule {}
