import { Module } from '@nestjs/common';
import { ClassesModule } from 'src/classes/classes.module';
import { StudentsModule } from 'src/students/students.module';
import { DashboardController } from './analytics.controller';
import { AnalyticsService } from './analytics-service';
import { UsersModule } from 'src/users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Student, StudentSchema } from 'src/students/schemas/student.schema';
import { User, UserSchema } from 'src/users/schemas/user.schema';

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
