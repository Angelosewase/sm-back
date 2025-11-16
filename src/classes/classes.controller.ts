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
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { QueryClassesDto } from './dto/query-classes.dto';
import { BulkClassActionDto } from './dto/bulk-class-action.dto';
import { SubjectService } from 'src/subjects/subject.service';
import { AssignTeacherDto } from 'src/teachers/dto/assign-teacher.dto';
import { TeachersService } from 'src/teachers/teachers.service';

@ApiTags('classes')
@Controller('api/classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService,
    private readonly subjectService: SubjectService,
    private readonly teacherService: TeachersService,
  ) {}

  @Post()
  create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }

  @Get()
  findAll(@Query() query: QueryClassesDto) {
    return this.classesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.classesService.restore(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto) {
    return this.classesService.update(id, updateClassDto);
  }

  @Delete(':id/permanent')
  removePermanently(@Param('id') id: string) {
    return this.classesService.removePermanently(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }

  @Post('bulk/trash')
  bulkTrash(@Body() bulkClassActionDto: BulkClassActionDto) {
    return this.classesService.bulkTrash(bulkClassActionDto.ids);
  }

  @Post('bulk/restore')
  bulkRestore(@Body() bulkClassActionDto: BulkClassActionDto) {
    return this.classesService.bulkRestore(bulkClassActionDto.ids);
  }

  @Post('bulk/permanent')
  bulkRemovePermanently(@Body() bulkClassActionDto: BulkClassActionDto) {
    return this.classesService.bulkRemovePermanently(bulkClassActionDto.ids);
  }


  @Post(':id/assign-subjects')
  @ApiOperation({ summary: 'Assign subjects to class' })
  async assignSubjects(@Param('id') classId: string, @Body('subjectIds') subjectIds: string[]) {
    return this.subjectService.assignSubjectsToClass(classId, subjectIds);
  }

  @Put(':id/remove-subject/:subjectId')
  @ApiOperation({ summary: 'Remove a subject from class' })
  async removeSubject(@Param('id') classId: string, @Param('subjectId') subjectId: string) {
    return this.subjectService.removeSubjectFromClass(classId, subjectId);
  }

  @Get(':id/subjects')
  @ApiOperation({ summary: 'List subjects assigned to a class' })
  async getClassSubjects(@Param('id') classId: string, @Query('teacher') teacher?: string) {
    return this.subjectService.listClassSubjects(classId, teacher);
  }

  @Get('subject/:subjectId/classes')
  @ApiOperation({ summary: 'List classes assigned to this subject' })
  async getClassesForSubject(@Param('subjectId') subjectId: string) {
    return this.subjectService.getClassesForSubject(subjectId);
  }

  @Put(':id/assign-class-teacher')
  @ApiOperation({ summary: 'Assign a teacher as the class teacher' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiBody({ type: AssignTeacherDto })
  @ApiResponse({ status: 200, description: 'Class teacher assigned.' })
  async assignClassTeacher(
    @Param('id') classId: string,
    @Body() assignDto: AssignTeacherDto,
  ) {
    return await this.classesService.assignClassTeacher(classId, assignDto.teacherId);
  }


  // DASHBOARD ENDPOINTS
  /**Class stats endpoints for returning average, class capacities */

   @Get('class-stats')
  @ApiOperation({ summary: 'Get class statistics for dashboard' })
  @ApiOkResponse({
    schema: {
      example: {
        totalEnrollment: 0,
        activeClasses: 0,
        averageCapacity: 0,
        utilizationRate: 0,
      }
    }
  })
  async getClassStats(@Query('schoolId') schoolId?: string) {
    return this.classesService.getClassStats(schoolId);
  }
}

