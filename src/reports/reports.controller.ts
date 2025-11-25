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
    name: 'academicYearId',
    description: 'Academic year ObjectId',
    required: true,
  })
  @ApiQuery({
    name: 'termId',
    description: 'Term ObjectId',
    required: false,
  })
  @ApiOkResponse({
    description: 'Generates and downloads the student academic report as PDF.',
  })
  async downloadStudentReport(
    @Param('studentId') studentId: string,
    @Query('academicYearId') academicYearId: string,
    @Query('termId') termId: string | undefined,
    @Res() res: Response,
  ) {
    const { buffer, fileName, contentType } =
      await this.reportsService.generateStudentReportPdf(
        studentId,
        academicYearId,
        termId,
      );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length.toString());

    return res.send(buffer);
  }
}