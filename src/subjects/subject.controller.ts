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

}
