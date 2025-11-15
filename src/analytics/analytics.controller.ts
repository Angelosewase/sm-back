import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ClassesService } from 'src/classes/classes.service';
import { StudentService } from 'src/students/student.service';

@ApiTags('Dashboard')
@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly studentsService: StudentService,
    private readonly classesService: ClassesService
  ) {}

  @Get('student-stats')
  @ApiOperation({ summary: 'Get student statistics and trends per school.' })
  @ApiOkResponse({ /* schema, see below */ })
  async getStudentStats(@Query('schoolId') schoolId?: string) {
    return this.studentsService.getStudentStats(schoolId);
  }

   @Get('class-stats')
  @ApiOperation({ summary: 'Get class statistics and time-series trends.' })
  @ApiOkResponse({ /* add schema example if needed */ })
  async getClassStats(@Query('schoolId') schoolId?: string) {
    return this.classesService.getClassStats(schoolId);
  }
}
