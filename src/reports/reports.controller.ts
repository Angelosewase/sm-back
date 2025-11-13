import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { type Response } from 'express';
import { ReportsService } from './reports.service';

@ApiBearerAuth('access-token')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('students/:studentId/report')
  @ApiParam({ name: 'studentId', description: 'Target student identifier' })
  @ApiQuery({
    name: 'academicYear',
    description: 'Academic year label (e.g. 2024/2025)',
    required: true,
  })
  @ApiQuery({
    name: 'term',
    description: 'Term or period label (e.g. Term 1)',
    required: false,
  })
  @ApiOkResponse({
    description: 'Generates and downloads the student academic report as PDF.',
  })
  async downloadStudentReport(
    @Param('studentId') studentId: string,
    @Query('academicYear') academicYear: string,
    @Query('term') term: string | undefined,
    @Res() res: Response,
  ) {
    const { buffer, fileName, contentType } =
      await this.reportsService.generateStudentReportPdf(
        studentId,
        academicYear,
        term,
      );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length.toString());

    return res.send(buffer);
  }
}