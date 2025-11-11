import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { QueryStudentsDto } from './dto/query-students.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ChangeStudentClassDto } from './dto/change-student-class.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';

@ApiTags('Students')
@Controller('api/students')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new student' })
  async create(@Body() dto: CreateStudentDto) {
    return this.studentService.registerStudent(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List students with filters, search, and pagination',
  })
  async list(@Query() query: QueryStudentsDto) {
    return this.studentService.findStudents(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a student by id' })
  async get(@Param('id') id: string) {
    const student = await this.studentService.getStudentById(id);
    if (!student) {
      throw new NotFoundException(`Student with id ${id} not found`);
    }
    return student;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a student record' })
  async update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.studentService.updateStudent(id, dto);
  }

  @Patch(':id/class')
  @ApiOperation({
    summary: 'Change or remove the class assignment for a student',
  })
  async changeClass(
    @Param('id') id: string,
    @Body() dto: ChangeStudentClassDto,
  ) {
    return this.studentService.changeStudentClass(id, dto);
  }

  @Patch(':id/trash')
  @ApiOperation({ summary: 'Move a student to trash (soft delete)' })
  async trash(@Param('id') id: string) {
    return this.studentService.trashStudent(id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a trashed student' })
  async restore(@Param('id') id: string) {
    return this.studentService.restoreStudent(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete a student' })
  async remove(@Param('id') id: string) {
    await this.studentService.removeStudent(id);
    return { deleted: true };
  }
}
