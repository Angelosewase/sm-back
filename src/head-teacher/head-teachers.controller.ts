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
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HeadTeachersService } from './head-teachers.service';
import { CreateHeadTeacherDto } from './dto/create-head-teacher.dto';
import { QueryHeadTeacherDto } from './dto/query-head-teacher.dto';
import { UpdateHeadTeacherDto } from './dto/update-head-teacher.dto';
import { HeadTeacher } from './schemas/head-teacher-schema';
@ApiTags('head-teachers')
@Controller('api/head-teachers')
export class HeadTeachersController {
  constructor(private readonly headTeachersService: HeadTeachersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new head teacher (creates user too)' })
  @ApiResponse({ status: 201, description: 'Head teacher created', type: HeadTeacher })
  create(@Body() createHeadTeacherDto: CreateHeadTeacherDto) {
    return this.headTeachersService.create(createHeadTeacherDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all head teachers' })
  @ApiResponse({ status: 200, description: 'Head teachers found', type: [HeadTeacher] })
  findAll(
    @Query() query: QueryHeadTeacherDto,
  ) {
    return this.headTeachersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get head teacher by ID' })
  @ApiResponse({ status: 200, description: 'Head teacher found', type: HeadTeacher })
  findOne(@Param('id') id: string) {
    return this.headTeachersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update head teacher by ID (updates user if needed)' })
  @ApiResponse({ status: 200, description: 'Head teacher updated', type: HeadTeacher })
  update(@Param('id') id: string, @Body() updateHeadTeacherDto: UpdateHeadTeacherDto) {
    return this.headTeachersService.update(id, updateHeadTeacherDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete head teacher by ID (deletes user too)' })
  @ApiResponse({ status: 200, description: 'Head teacher deleted', type: HeadTeacher })
  remove(@Param('id') id: string) {
    return this.headTeachersService.delete(id);
  }
}
