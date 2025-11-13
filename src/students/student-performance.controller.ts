import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { StudentPerformanceService } from './student-performance.service';
import { StudentPerformanceQueryDto } from './dto/student-performance-query.dto';

@ApiTags('Students')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('api/students/:studentId/performance')
export class StudentPerformanceController {
  constructor(
    private readonly studentPerformanceService: StudentPerformanceService,
  ) {}

  @Get('summary')
  @ApiOperation({
    summary:
      'Get student performance summary grouped by subject with overall percentage.',
  })
  async getSummary(
    @Param('studentId') studentId: string,
    @Query() query: StudentPerformanceQueryDto,
  ) {
    return this.studentPerformanceService.getStudentPerformanceSummary(
      studentId,
      query,
    );
  }

  @Get('assignments')
  @ApiOperation({
    summary:
      'Get detailed student performance per subject, academic year, and assessment.',
  })
  async getAssignmentsBreakdown(
    @Param('studentId') studentId: string,
    @Query() query: StudentPerformanceQueryDto,
  ) {
    return this.studentPerformanceService.getStudentAssignmentsBreakdown(
      studentId,
      query,
    );
  }
}


