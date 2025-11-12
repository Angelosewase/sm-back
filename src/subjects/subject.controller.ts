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
  ApiParam,
  ApiQuery,
  ApiResponse,
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
    );
  }


  // Query endpoints
  @Get('class/:classId/subjects')
  async getClassSubjects(
    @Param('classId') classId: string,
  ) {
    return this.subjectService.listClassSubjects(classId)
  }


  @Get('teacher/:teacherId/subjects')
  async getTeacherSubjects(
    @Param('teacherId') teacherId: string,
    @Query() query: QuerySubjectDto
  ) {
    return this.subjectService.listTeacherSubjects(teacherId, query);
  }
  @Get('all-assignments/subjects')
  async getAllAssignedSubjects(
   @Query() query: QuerySubjectDto
  ) {
    return this.subjectService.findAll(query);
  }



  // subjects.controller.ts

  @Get(':subjectId/stats')
  @ApiOperation({
    summary: 'Get dashboard stats for a subject',
    description: 'Returns aggregated dashboard stats for a subject by ID, with options to filter by class or term.'
  })
  @ApiParam({
    name: 'subjectId',
    description: 'The unique identifier of the subject',
    type: String,
    example: '507f1f77bcf86cd799439011'
  })
  @ApiQuery({
    name: 'classId',
    required: false,
    description: 'Optional class ID if filtering for a specific class',
    type: String,
    example: '507f1f77bcf86cd799439012'
  })
  @ApiQuery({
    name: 'term',
    required: false,
    description: 'Optional term ID if filtering for a school term',
    type: String,
    example: 'First Term 2024'
  })
  @ApiResponse({
    status: 200,
    description: 'Subject dashboard stats',
    schema: {
      example: {
        totalAssessments: 4,
        completedAssessments: 2,
        totalWeight: 55,
        averageScore: 61.9,
        completionRate: 50,
        latestMarkDate: "2025-10-18T10:20:00.001Z"
      }
    }
  })
  async getSubjectStats(
    @Param('subjectId') subjectId: string,
    @Query('classId') classId?: string,
    @Query('term') term?: string,
  ) {
    return this.subjectService.getSubjectStats(subjectId, classId, term);
  }


@Get(':subjectId/assessments')
  @ApiOperation({
    summary: 'Get all assessments for a subject',
    description: 'Returns all assessments for a subject, with stats, by subject ID and optional class/term filtering'
  })
  @ApiParam({ name: 'subjectId', description: 'Subject unique ID', example: '507f1f77bcf86cd799439011' })
  @ApiQuery({ name: 'classId', required: false, description: 'Optional class ID', example: '507f1f77bcf86cd799439012' })
  @ApiQuery({ name: 'term', required: false, description: 'Optional term filter', example: 'First Term 2024' })
  @ApiResponse({
    status: 200,
    description: 'Assessment summary for subject',
    schema: {
      example: [
        {
          assessmentId: "6534f09d5eddb825aefe4bb1",
          title: "Quiz 1 - Grammar Basics",
          assessmentType: "Quiz",
          weight: 10,
          createdAt: "2024-10-15T00:00:00.001Z",
          maxScore: 20,
          class: "Primary 5A",
          completedCount: 28,
          totalCount: 28,
          completionRate: 100,
          averageScore: 16.5,
          status: "Completed"
        }
      ]
    }
  })
  async getSubjectAssessments(
    @Param('subjectId') subjectId: string,
    @Query('classId') classId?: string,
    @Query('term') term?: string,
  ) {
    return this.subjectService.getSubjectAssessments(subjectId, classId, term);
  }


}


