import { Controller, Get, Query, Res, Param, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { MarksService } from 'src/marks/marks.service';

@ApiBearerAuth('access-token')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly marksService: MarksService,
  ) {}

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('class-performance')
  async classPerformance(@Query() q: any) {
    const { classId, academicYear, term } = q;
    return this.marksService.getClassPerformance(classId, academicYear, term);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('student-term')
  async studentTerm(@Query() q: any) {
    // TODO: implement using marks aggregation per student
    return { message: 'student term report not yet implemented', query: q };
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('class/:id/pdf')
  async classPdf(
    @Param('id') id: string,
    @Query() q: any,
    @Res() res: Response,
  ) {
    const { academicYear } = q || {};
    if (!academicYear) {
      return res
        .status(400)
        .json({ error: 'academicYear query parameter is required' });
    }

    // compute per-subject quarter averages
    const qAverages = await this.marksService.getClassSubjectQuarterAverages(
      id,
      academicYear,
    );

    // attempt to include class avatar if any (not typical, but reuse loadAvatarDataUri)
    const classAvatarUri = null; // optional: if you store class avatars, resolve here

    // const html = this.pdfService.buildClassQuarterHtml({
    //   schoolName: 'School',
    //   className: id,
    //   academicYear: academicYear || '',
    //   avatarDataUri: classAvatarUri,
    //   subjects: qAverages,
    // });

    // const pdf = await this.pdfService.generatePdfFromHtml(html);
    // res.setHeader('Content-Type', 'application/pdf');
    // res.setHeader(
    //   'Content-Disposition',
    //   `attachment; filename="class-${id}-report.pdf"`,
    // );
    // if (pdf && Buffer.isBuffer(pdf)) {
    //   res.setHeader('Content-Length', String(pdf.length));
    // }
    // res.send(pdf);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('student/:id/pdf')
  async studentPdf(
    @Param('id') id: string,
    @Query() q: any,
    @Res() res: Response,
  ) {
    const { academicYear, classId } = q || {};
    if (!academicYear)
      return res.status(400).json({ error: 'academicYear is required' });

    const report = await this.marksService.getStudentAcademicReport(
      id,
      academicYear,
      classId,
    );

    // const user = await this.pdfService.resolveStudentInfo(id);
    // const avatarUri = await this.pdfService.loadAvatarDataUri(user?.avatar);
    // const html = await this.pdfService.buildStudentReportHtml({
    //   ...report,
    //   studentName: user?.name || user?.fullName || 'Student',
    //   avatarDataUri: avatarUri,
    // });
    // const pdf = await this.pdfService.generatePdfFromHtml(html);
    // res.setHeader('Content-Type', 'application/pdf');
    // res.setHeader(
    //   'Content-Disposition',
    //   `attachment; filename="student-${id}-report.pdf"`,
    // );
    // if (pdf && Buffer.isBuffer(pdf))
    //   res.setHeader('Content-Length', String(pdf.length));
    // res.send(pdf);
  }
}
