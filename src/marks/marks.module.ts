import { Module, forwardRef } from '@nestjs/common';
import { MarksController } from './marks.controller';
import { MarksService } from './marks.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Marks, MarksSchema } from 'src/marks/schemas/marks.schema';
import { Subject, SubjectSchema } from 'src/subjects/schemas/subject.schema';
import { Assessment, AssessmentSchema } from 'src/assessments/schemas/assessment-schema';
import { ClassesModule } from 'src/classes/classes.module';
import { StudentsModule } from 'src/students/students.module';
import { Student, StudentSchema } from 'src/students/schemas/student.schema';
import { EventsModule } from 'src/events/events.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Marks.name, schema: MarksSchema },
      { name: Subject.name, schema: SubjectSchema },
      { name: Assessment.name, schema: AssessmentSchema },
      { name: Student.name, schema: StudentSchema },
    ]),
    forwardRef(() => ClassesModule),
    StudentsModule,
    EventsModule
  ],
  controllers: [MarksController],
  providers: [MarksService],
  exports: [MarksService],
})
export class MarksModule {}
