import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { QueryTeacherDto } from './dto/query-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { AssignClassesDto } from './dto/assign-classes.dto';
import { AssignSubjectsDto } from './dto/assign-subjects.dto';

@ApiTags('teachers')
@Controller('api/teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new teacher' })
  @ApiCreatedResponse({
    description:
      'Teacher registered successfully. Response includes a temporaryPassword field that is also emailed.',
  })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(@Body() createTeacherDto: CreateTeacherDto) {
    return this.teachersService.create(createTeacherDto);
  }

  @Get()
@ApiOperation({
    summary: 'List teachers with optional filtering, search, and pagination',
  })
  @ApiQuery({ name: 'q', required: false, description: 'Search across name and email' })
  @ApiQuery({ name: 'email', required: false, description: 'Filter by exact email address' })
  @ApiQuery({ name: 'school', required: false, description: 'Filter by school ObjectId' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (1-100)', example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Field to sort by', example: 'createdAt' })
  @ApiQuery({ name: 'order', required: false, description: 'Sort direction', example: 'desc' })
  @ApiOkResponse({ description: 'Teachers retrieved successfully with pagination metadata' })
  async findAll(@Query() query: QueryTeacherDto) {
    return this.teachersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get teacher by id' })
  @ApiOkResponse({ description: 'Teacher retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Teacher not found' })
  async findOne(@Param('id') id: string) {
    return this.teachersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a teacher profile' })
  @ApiOkResponse({ description: 'Teacher updated successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiNotFoundResponse({ description: 'Teacher not found' })
  async update(
    @Param('id') id: string,
    @Body() updateTeacherDto: UpdateTeacherDto,
  ) {
    return this.teachersService.update(id, updateTeacherDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a teacher' })
  @ApiOkResponse({ description: 'Teacher removed successfully' })
  @ApiNotFoundResponse({ description: 'Teacher not found' })
  async remove(@Param('id') id: string) {
    return this.teachersService.remove(id);
  }

  @Post(':id/classes')
  @ApiOperation({ summary: 'Assign classes to a teacher' })
  @ApiOkResponse({ description: 'Classes assigned successfully' })
  @ApiBadRequestResponse({ description: 'Invalid request payload' })
  @ApiNotFoundResponse({ description: 'Teacher or class not found' })
  async assignClasses(
    @Param('id') id: string,
    @Body() dto: AssignClassesDto,
  ) {
    return this.teachersService.assignClasses(id, dto.classIds);
  }

  @Post(':id/subjects')
  @ApiOperation({ summary: 'Assign subjects to a teacher' })
  @ApiOkResponse({ description: 'Subjects assigned successfully' })
  @ApiBadRequestResponse({ description: 'Invalid request payload' })
  @ApiNotFoundResponse({ description: 'Teacher or subject not found' })
  async assignSubjects(
    @Param('id') id: string,
    @Body() dto: AssignSubjectsDto,
  ) {
    return this.teachersService.assignSubjects(id, dto.subjectIds);
  }
}


