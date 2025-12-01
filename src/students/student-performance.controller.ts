import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { StudentPerformanceService } from './student-performance.service';
import { StudentPerformanceQueryDto } from './dto/student-performance-query.dto';
import { SubjectAssessmentPerformanceQueryDto } from './dto/subject-assessment-performance-query.dto';

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

  @Get('')
  @ApiOperation({
    summary:
      'Get subject assessment performances grouped by academic year and subject with scores keyed by assessment id.',
  })
  async getSubjectAssessments(
    @Param('studentId') routeStudentId: string,
    @Query() query: SubjectAssessmentPerformanceQueryDto,
  ) {
    const candidateStudentId = query.studentId ?? routeStudentId;
    const normalizedStudentId =
      candidateStudentId && candidateStudentId.toLowerCase() === 'all'
        ? undefined
        : candidateStudentId;

    const filters = {
      termId: query.termId,
      academicYearId: query.academicYearId,
      studentId: normalizedStudentId,
    };

    return this.studentPerformanceService.getSubjectAssessmentPerformances(filters);
  }

  @Get('assessments')
  @ApiOperation({
    summary:
      'Get individual assessments related to a student with optional term and year filters.',
  })
  async getStudentAssessments(
    @Param('studentId') routeStudentId: string,
    @Query() query: SubjectAssessmentPerformanceQueryDto,
  ) {
    const candidateStudentId = query.studentId ?? routeStudentId;
    const normalizedStudentId =
      candidateStudentId && candidateStudentId.toLowerCase() === 'all'
        ? undefined
        : candidateStudentId;

    const filters = {
      termId: query.termId,
      academicYearId: query.academicYearId,
      studentId: normalizedStudentId,
    };

    return this.studentPerformanceService.getStudentAssessments(filters);
  }
}


