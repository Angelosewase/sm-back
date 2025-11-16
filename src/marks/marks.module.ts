import { Module } from '@nestjs/common';
import { MarksController } from './marks.controller';
import { MarksService } from './marks.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Marks, MarksSchema } from 'src/marks/schemas/marks.schema';
import { Subject, SubjectSchema } from 'src/subjects/schemas/subject.schema';
import { Assessment, AssessmentSchema } from 'src/assessments/schemas/assessment-schema';
import { ClassesModule } from 'src/classes/classes.module';
import { StudentsModule } from 'src/students/students.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Marks.name, schema: MarksSchema },
      { name: Subject.name, schema: SubjectSchema },
      { name: Assessment.name, schema: AssessmentSchema },
    ]),
    ClassesModule,
    StudentsModule,
  ],
  controllers: [MarksController],
  providers: [MarksService],
  exports: [MarksService],
})
export class MarksModule {}
