import { Module } from '@nestjs/common';
import { ClassesModule } from 'src/classes/classes.module';
import { StudentsModule } from 'src/students/students.module';
import { DashboardController } from './analytics.controller';
import { AnalyticsService } from './analytics-service';
import { UsersModule } from 'src/users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Student, StudentSchema } from 'src/students/schemas/student.schema';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { Term, TermSchema } from 'src/terms/schemas/term.schema';
import { Marks, MarksSchema } from 'src/marks/schemas/marks.schema';
import {
  AcademicYear,
  AcademicYearSchema,
} from 'src/academic-year/schemas/academic-year.schema';
import { Class, ClassSchema } from 'src/classes/schemas/class.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Student.name,
        schema: StudentSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Marks.name,
        schema: MarksSchema,
      },
      {
        name: Term.name,
        schema: TermSchema,
      },
      {
        name: AcademicYear.name,
        schema: AcademicYearSchema,
      },
      {
        name: Class.name,
        schema: ClassSchema,
      },
    ]),
    StudentsModule,
    ClassesModule,
    UsersModule,
    StudentsModule,
  ],
  controllers: [DashboardController],
  providers: [AnalyticsService],
  exports: [],
})
export class AnalyticsModule {}
