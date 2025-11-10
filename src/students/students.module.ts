import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Student, StudentSchema } from './schemas/student.schema';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { EnrollmentService } from './enrollment.service';
import { Enrollment, EnrollmentSchema } from './schemas/enrollment.schema';
import { SchoolModule } from 'src/school-module/school-module.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
    ]),
    forwardRef(() => SchoolModule) ,
  ],
  controllers: [StudentController],
  providers: [StudentService, EnrollmentService],
  exports: [StudentService, EnrollmentService],
})
export class StudentsModule {}
