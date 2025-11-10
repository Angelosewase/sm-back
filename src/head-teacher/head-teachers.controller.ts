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
  ApiTags,
} from '@nestjs/swagger';
import { HeadTeachersService } from './head-teachers.service';
import { CreateHeadTeacherDto } from './dto/create-head-teacher.dto';
import { QueryHeadTeacherDto } from './dto/query-head-teacher.dto';
import { UpdateHeadTeacherDto } from './dto/update-head-teacher.dto';

@ApiTags('teachers')
@Controller('api/head-teachers')
export class HeadTeachersController {
  constructor(private readonly teachersService: HeadTeachersService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new teacher' })
  @ApiCreatedResponse({ description: 'Teacher registered successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(@Body() createTeacherDto: CreateHeadTeacherDto) {
    return this.teachersService.create(createTeacherDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List teachers with optional filtering, search, and pagination',
  })
  @ApiOkResponse({ description: 'Teachers retrieved successfully' })
  async findAll(@Query() query: QueryHeadTeacherDto) {
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
    @Body() updateTeacherDto: UpdateHeadTeacherDto,
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
}
