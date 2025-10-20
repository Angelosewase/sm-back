import { Controller, Get, Query, Res, Param } from '@nestjs/common';
import { MarksService } from '../services/marks.service';
import { PdfService } from '../services/pdf.service';
import type { Response } from 'express';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly marksService: MarksService,
    private readonly pdfService: PdfService,
  ) {}

  @Get('class-performance')
  async classPerformance(@Query() q: any) {
    const { classId, academicYear, term } = q;
    return this.marksService.getClassPerformance(classId, academicYear, term);
  }

  @Get('student-term')
  async studentTerm(@Query() q: any) {
    // TODO: implement using marks aggregation per student
    return { message: 'student term report not yet implemented', query: q };
  }

  @Get('class/:id/pdf')
  async classPdf(
    @Param('id') id: string,
    @Query() q: any,
    @Res() res: Response,
  ) {
    const { academicYear, term } = q;
    const perf = await this.marksService.getClassPerformance(
      id,
      academicYear,
      term,
      500,
    );

    // build simple students and subjects arrays
    const subjects = (perf.subjectStats || []).map((s: any) => ({
      _id: s.subject?._id || s._id,
      name: s.subject?.name || s.subjectName || 'Subject',
    }));
    const students = (perf.topStudents || []).map((s: any) => ({
      name: s.student?.fullName || s.student?.firstName || 'Student',
      scores: {},
      total: Math.round(s.avgScore || 0),
      percentage: Math.round(s.avgScore || 0),
    }));

    const html = this.pdfService.buildClassPerformanceHtml({
      schoolName: 'School',
      className: id,
      academicYear: academicYear || '',
      students,
      subjects,
    });

    const pdf = await this.pdfService.generatePdfFromHtml(html);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="class-${id}-report.pdf"`,
    );
    res.send(pdf);
  }
}
