import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarksModule } from 'src/marks/marks.module';
import { StudentsModule } from 'src/students/students.module';
import { Class, ClassSchema } from 'src/classes/schemas/class.schema';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsPdfService } from './reports-pdf.service';

@Module({
  imports: [
    MarksModule,
    StudentsModule,
    MongooseModule.forFeature([{ name: Class.name, schema: ClassSchema }]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsPdfService],
  exports: [ReportsService],
})
export class ReportsModule {}
