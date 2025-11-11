import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { QueryTeacherDto } from './dto/query-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { AssignClassesDto } from './dto/assign-classes.dto';
import { AssignSubjectsDto } from 'src/subjects/dto/assign-subjects.dto';
import { Teacher } from './schemas/teacher.schema';
import { UnassignClassesDto } from './dto/unassign-class.dto';
@ApiTags('teachers')
@Controller('api/teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new teacher (creates user too)' })
  @ApiResponse({ status: 201, description: 'Teacher created', type: Teacher })
  create(@Body() createTeacherDto: CreateTeacherDto) {
    return this.teachersService.create(createTeacherDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all teachers' })
  @ApiResponse({ status: 200, description: 'Teachers found', type: [Teacher] })
  findAll(@Query() query: QueryTeacherDto) {
    return this.teachersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get teacher by ID' })
  @ApiResponse({ status: 200, description: 'Teacher found', type: Teacher })
  findOne(@Param('id') id: string) {
    return this.teachersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update teacher by ID (updates user if needed)' })
  @ApiResponse({ status: 200, description: 'Teacher updated', type: Teacher })
  update(@Param('id') id: string, @Body() updateTeacherDto: UpdateTeacherDto) {
    return this.teachersService.update(id, updateTeacherDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete teacher by ID (deletes user too)' })
  @ApiResponse({ status: 200, description: 'Teacher deleted', type: Teacher })
  remove(@Param('id') id: string) {
    return this.teachersService.delete(id);
  }

  @Post(':id/classes')
  @ApiOperation({ summary: 'Assign classes to a teacher' })
  assignClasses(@Param('id') id: string, @Body() body: AssignClassesDto) {
    return this.teachersService.assignClasses(id, body.classIds);
  }

  @Post(':id/subjects')
  @ApiOperation({ summary: 'Assign subjects to a teacher' })
  assignSubjects(@Param('id') id: string, @Body() body: AssignSubjectsDto) {
    return this.teachersService.assignSubjects(id, body.subjectIds);
  }

  @Delete(':id/classes')
  @ApiOperation({ summary: 'Unassign (remove) classes from a teacher' })
  @ApiResponse({ status: 200, description: 'Classes unassigned successfully' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  @ApiResponse({ status: 400, description: 'Invalid class IDs' })
  unassignClasses(@Param('id') id: string, @Body() body: UnassignClassesDto) {
    return this.teachersService.unassignClasses(id, body.classIds);
  }


  @Put(':id/remove-subject/:subjectId')
  @ApiOperation({ summary: 'Remove subject from teacher' })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  @ApiParam({ name: 'subjectId', description: 'Subject ID' })
  @ApiResponse({ status: 200, description: 'Subject removed.' })
  async removeSubjectFromTeacher(
    @Param('id') teacherId: string,
    @Param('subjectId') subjectId: string,
  ) {
    return await this.teachersService.removeSubjectFromTeacher(teacherId, subjectId);
  }
}
