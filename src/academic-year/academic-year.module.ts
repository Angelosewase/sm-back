// src/academic-year/academic-year.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AcademicYearService } from './academic-year.service';
import { AcademicYearController } from './academic-year.controller';
import {
  AcademicYear,
  AcademicYearSchema,
} from 'src/academic-year/schemas/academic-year.schema';
import { Term, TermSchema } from 'src/terms/schemas/term.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AcademicYear.name, schema: AcademicYearSchema },
      { name: Term.name, schema: TermSchema },
    ]),
  ],
  controllers: [AcademicYearController],
  providers: [AcademicYearService],
  exports: [AcademicYearService],
})
export class AcademicYearModule {}
