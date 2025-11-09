import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  Patch,
  UseGuards,
  Delete,
  Req,
} from '@nestjs/common';
import { SubjectService } from './subject.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { QuerySubjectDto } from './dto/query-subject.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from 'src/users/schemas/user.schema';
import { Roles } from 'src/auth/decorators/roles.decorator';
import {
  AssignSubjecctToClassDto,
  AssignSubjectDto,
  AssignSubjectToClassWithTeacherDto,
  AssignSubjectToTeacherDto,
} from './dto/assign-subject.dto';

@ApiTags('Subjects')
@Controller('api/subjects')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Successfully created subject' })
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateSubjectDto) {
    return this.subjectService.createSubject(dto);
  }

  // @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Successfully fetched subjects' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Query() query: QuerySubjectDto) {
    const filter: any = {};
    return this.subjectService.findAll(query);
  }

  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Successfully fetched subject' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async get(@Param('id') id: string) {
    return this.subjectService.getSubjectById(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Successfully updated subject' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjectService.updateSubject(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Successfully deleted subject' })
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.subjectService.deleteSubject(id);
  }

  @ApiOperation({
    summary: 'Assign a subject to a class (optionally with teacher)',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF, Role.HEADTeacher)
  @Post(':id/assign-to-class')
  async assignSubject(
    @Param('id') id: string,
    @Body() dto: AssignSubjecctToClassDto,
    @Req() req: any,
  ) {
    return this.subjectService.assignSubjectToClass(
      id,
      dto.classId,
      dto.academicYear,
      dto.term,
    );
  }

  @ApiOperation({
    summary: 'Assign a subject to a class (optionally with teacher)',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF, Role.HEADTeacher)
  @Post(':id/assign-to-teacher')
  async assignSubjectToTeacher(
    @Param('id') id: string,
    @Body() dto: AssignSubjectToTeacherDto,
    @Req() req: any,
  ) {
    return this.subjectService.assignSubjectToTeacher(
      id,
      dto.teacherId,
      dto.academicYear,
      dto.term,
    );
  }

  @ApiOperation({
    summary: 'Assign a subject to a class (optionally with teacher)',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF, Role.HEADTeacher)
  @Post(':id/assign-to-class-with-teacher')
  async assignSubjectToClassWithTeacher(
    @Param('id') id: string,
    @Body() dto: AssignSubjectToClassWithTeacherDto,
    @Req() req: any,
  ) {
    return this.subjectService.assignSubjectToClassWithTeacher(
      id,
      dto.classId,
      dto.teacherId,
      dto.academicYear,
      dto.term,
    );
  }

  // Assignment endpoints
  @Post('assign/class')
  async assignToClass(
    @Body()
    body: {
      subjectId: string;
      classId: string;
      academicYear: string;
      teacherId?: string;
      term?: string;
      hoursPerWeek?: number;
    },
  ) {
    return this.subjectService.assignSubjectToClass(
      body.subjectId,
      body.classId,
      body.academicYear,
      body.teacherId,
      body.term,
      body.hoursPerWeek,
    );
  }

  @Delete('assignments/:assignmentId')
  async deleteAssignment(@Param('assignmentId') assignmentId: string) {
    return this.subjectService.deleteAssignment(assignmentId);
  }

  @Delete('remove-from-class')
  async removeFromClass(
    @Body()
    body: {
      subjectId: string;
      classId: string;
      academicYear: string;
      term?: string;
    },
  ) {
    return this.subjectService.removeSubjectFromClass(
      body.subjectId,
      body.classId,
      body.academicYear,
      body.term,
    );
  }

  @Patch('assignments/:assignmentId')
  async updateAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body()
    body: {
      teacherId?: string;
      term?: string;
      hoursPerWeek?: number;
    },
  ) {
    return this.subjectService.updateAssignment(assignmentId, body);
  }

  // Query endpoints
  @Get('class/:classId/subjects')
  async getClassSubjects(
    @Param('classId') classId: string,
    @Query('academicYear') academicYear?: string,
    @Query('term') term?: string,
  ) {
    return this.subjectService.getClassSubjects(classId, {
      academicYear,
      term,
    });
  }

  @Get(':subjectId/classes')
  async getSubjectClasses(
    @Param('subjectId') subjectId: string,
    @Query('academicYear') academicYear?: string,
    @Query('term') term?: string,
  ) {
    return this.subjectService.getSubjectClasses_Teachers_Students(subjectId, {
      academicYear,
      term,
    });
  }

  @Get('all-assignments/subjects')
  async getAllAssignedSubjects(
    @Query('academicYear') academicYear?: string | undefined,
    @Query('term') term?: string | undefined,
  ) {
    return this.subjectService.getAllAssignments({
      academicYear,
      term,
    });
  }
  @Get('teacher/:teacherId/subjects')
  async getTeacherSubjects(
    @Param('teacherId') teacherId: string,
    @Query('academicYear') academicYear?: string,
    @Query('term') term?: string,
  ) {
    return this.subjectService.getTeacherSubjects(teacherId, {
      academicYear,
      term,
    });
  }

  @Get('teacher/:teacherId/classes')
  async getTeacherClasses(
    @Param('teacherId') teacherId: string,
    @Query('academicYear') academicYear?: string,
    @Query('term') term?: string,
  ) {
    return this.subjectService.getTeacherClasses(teacherId, {
      academicYear,
      term,
    });
  }

  @Get('teacher/:teacherId/schedule')
  async getTeacherSchedule(
    @Param('teacherId') teacherId: string,
    @Query('academicYear') academicYear: string,
    @Query('term') term?: string,
  ) {
    return this.subjectService.getTeacherSchedule(
      teacherId,
      academicYear,
      term,
    );
  }

  // Analytics endpoints
  @Get('analytics/school/:schoolId')
  async getSchoolStats(
    @Param('schoolId') schoolId: string,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.subjectService.getSchoolAssignmentStats(schoolId, academicYear);
  }

  @Get('analytics/teacher/:teacherId/workload')
  async getTeacherWorkload(
    @Param('teacherId') teacherId: string,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.subjectService.getTeacherWorkload(teacherId, academicYear);
  }

  @Get('analytics/class/:classId/coverage')
  async getClassCoverage(
    @Param('classId') classId: string,
    @Query('academicYear') academicYear: string,
  ) {
    return this.subjectService.getClassCoverage(classId, academicYear);
  }

  @Post('assignments/:assignmentId/co-teachers')
  async addCoTeacher(
    @Param('assignmentId') assignmentId: string,
    @Body('coTeacherId') coTeacherId: string,
  ) {
    return this.subjectService.addCoTeacher(assignmentId, coTeacherId);
  }

  @Delete('assignments/:assignmentId/co-teachers/:coTeacherId')
  async removeCoTeacher(
    @Param('assignmentId') assignmentId: string,
    @Param('coTeacherId') coTeacherId: string,
  ) {
    return this.subjectService.removeCoTeacher(assignmentId, coTeacherId);
  }

  @Post(':subjectId/assign-multiple')
  async assignBulk(
    @Param('subjectId') subjectId: string,
    @Body()
    bulk: {
      assignments: Array<{
        classId: string;
        teacherId: string;
        academicYear: string;
        term?: string;
      }>;
    },
  ) {
    return await this.subjectService.assignMultipleToClasses(
      subjectId,
      bulk.assignments,
    );
  }
}
