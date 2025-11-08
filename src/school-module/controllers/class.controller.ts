import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ClassService } from '../services/class.service';
import { SubjectAssignmentService } from '../services/subject-assignment.service';
import { AssignSubjectDto } from '../dto/assign-subject.dto';
import { CreateClassDto } from '../dto/create-class.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../users/schemas/user.schema';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { AssignTeacherDto } from '../dto/assign-teacher.dto';

@Controller('api/classes')
export class ClassController {
  constructor(
    private readonly classService: ClassService,
    private readonly saService: SubjectAssignmentService,
  ) {}

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF, Role.HEADTeacher)
  @Post()
  @ApiOkResponse({description: 'Class created'})
  async create(@Body() dto: CreateClassDto) {
    return this.classService.createClass(dto, null);
  }

  @ApiOperation({ summary: 'Assign a teacher to class' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @Post(':id/teachers')
  async assignTeacher(
    @Param('id') id: string,
    @Body() body: AssignTeacherDto,
    @Req() req: any,
  ) {
    return this.classService.assignTeacherToClass(id, body.teacherId, req.user);
  }


  @Get()
  async list(@Query() query: any) {
    return this.classService.listClasses(query);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.classService.getClassById(id);
  }
}
