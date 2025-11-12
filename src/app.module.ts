import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { ClassesModule } from './classes/classes.module';
import { AcademicYearModule } from './academic-year/academic-year.module';
import { TermModule } from './terms/terms.module';
import { TeachersModule } from './teachers/teachers.module';
import { StaffModule } from './staff/staff.module';
import { SchoolModule } from './school/school.module';
import { SubjectsModule } from './subjects/subjects.module';
import { HeadTeachersModule } from './head-teacher/head-teachers.module';
import { MarksModule } from './marks/marks.module';
import { StudentsModule } from './students/students.module';
import { ReportsModule } from './reports/reports.module';
import { AssessmentModule } from './assessments/assessment.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI as string),
    AuthModule,
    UsersModule,
    DatabaseModule,
    ClassesModule,
    SubjectsModule,
    SchoolModule,
    AcademicYearModule,
    TermModule,
    TeachersModule,
    HeadTeachersModule,
    StudentsModule,
    ReportsModule,
    MarksModule,
    StaffModule,
    AnalyticsModule,
    AssessmentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
