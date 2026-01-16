import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ClassesService } from 'src/classes/classes.service';
import { StudentService } from 'src/students/student.service';
import { AnalyticsService } from './analytics-service';
import { AdminStatsDto } from './dto/admin-stats-dto';
import {
  SchoolPerformanceAnalyticsDto,
  HeadTeacherSubjectStatsDto,
} from './dto/analytics.dto';
import { PerformanceQueryDto } from './dto/analytics-query.dto';

@ApiTags('Dashboard')
@Controller('api/dashboard')
export class DashboardController {
  constructor(
    private readonly studentsService: StudentService,
    private readonly classesService: ClassesService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('student-stats')
  @ApiOperation({ summary: 'Get student statistics and trends per school.' })
  @ApiOkResponse({
    /* schema, see below */
  })
  async getStudentStats(@Query('schoolId') schoolId?: string) {
    return this.studentsService.getStudentStats(schoolId);
  }

  @Get('class-stats')
  @ApiOperation({ summary: 'Get class statistics and time-series trends.' })
  @ApiOkResponse({
    /* add schema example if needed */
  })
  async getClassStats(@Query('schoolId') schoolId?: string) {
    return this.classesService.getClassStats(schoolId);
  }

  @Get('admin-stats/:schoolId')
  async getStats(@Param('schoolId') schoolId: string): Promise<AdminStatsDto> {
    return this.analyticsService.getAdminStats(schoolId);
  }

  @Get('registration-analytics/:schoolId')
  @ApiOkResponse({
    /* add schema example if needed */
  })
  @ApiOperation({ summary: 'Get registration analytics.' })
  async getRegistrationAnalytics(
    @Param('schoolId') schoolId: string,
  ): Promise<any> {
    return this.analyticsService.getRegistrationAnalytics(schoolId);
  }

  @Get('performance')
  @ApiOkResponse({
    /* add schema example if needed */
  })
  @ApiOperation({ summary: 'Get performance analytics.' })
  async getPerformance(
    @Query() query: PerformanceQueryDto,
  ): Promise<SchoolPerformanceAnalyticsDto> {
    return this.analyticsService.getPerformanceAnalytics(query);
  }

  @Get('subject-stats')
  @ApiOperation({ summary: 'Get head-teacher subject statistics' })
  @ApiOkResponse({
    description: 'Head-teacher subject statistics',
    schema: {
      example: {
        totalSubjects: 13,
        totalTeachers: 18,
        averageClassSize: 28,
        averagePerformance: 87,
        performanceGrade: 'B',
        schoolId: '507f1f77bcf86cd799439011',
      },
    },
  })
  async getHeadTeacherSubjectStats(
    @Query('schoolId') schoolId: string,
  ): Promise<HeadTeacherSubjectStatsDto> {
    return this.analyticsService.getHeadTeacherSubjectStats(
      schoolId,
    );
  }
}
