import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Subject, SubjectSchema } from '../subjects/schemas/subject.schema';
import { Student, StudentSchema } from '../students/schemas/student.schema';
import {
  Enrollment,
  EnrollmentSchema,
} from '../students/schemas/enrollment.schema';
import { Marks, MarksSchema } from '../marks/schemas/marks.schema';
import {
  AcademicYear,
  AcademicYearSchema,
} from '../academic-year/schemas/academic-year.schema';
import { Term, TermSchema } from '../terms/schemas/term.schema';
import { AuditLog, AuditLogSchema } from './schemas/audit.schema';
import { CsvImportService } from './services/csv-import.service';
import { PdfService } from './services/pdf.service';
import { SchoolModuleController } from './school-module.controller';
import { SchoolModuleService } from './school-module.service';
import { School, SchoolSchema } from './schemas/school.schema';
import { UsersModule } from 'src/users/users.module';
import { SubjectsModule } from 'src/subjects/subjects.module';
import { ClassesModule } from 'src/classes/classes.module';
import { StudentsModule } from 'src/students/students.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: Marks.name, schema: MarksSchema },
      { name: AcademicYear.name, schema: AcademicYearSchema },
      { name: Term.name, schema: TermSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: School.name, schema: SchoolSchema },
      { name: Subject.name, schema: SubjectSchema },
    ]),
    UsersModule,
    forwardRef(()=> SubjectsModule),
    forwardRef(()=> ClassesModule),
    forwardRef(()=> StudentsModule),
  ],
  providers: [CsvImportService, PdfService, SchoolModuleService],
  controllers: [SchoolModuleController],
  exports: [CsvImportService, PdfService, SchoolModuleService],
})
export class SchoolModule {}
