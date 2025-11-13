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
import { BulkTeacherActionDto } from './dto/bulk-teacher-action.dto';
import { Teacher } from './schemas/teacher.schema';
import { UnassignClassesDto } from './dto/unassign-class.dto';
import { UnassignSubjectsDto } from './dto/unassign-subjects.dto';
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
  @ApiOperation({ summary: 'Move teacher to trash' })
  @ApiResponse({
    status: 200,
    description: 'Teacher moved to trash',
    type: Teacher,
  })
  remove(@Param('id') id: string) {
    return this.teachersService.delete(id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a trashed teacher' })
  restore(@Param('id') id: string) {
    return this.teachersService.restore(id);
  }

  @Delete(':id/permanent')
  @ApiOperation({ summary: 'Permanently remove a trashed teacher' })
  removePermanently(@Param('id') id: string) {
    return this.teachersService.removePermanently(id);
  }

  @Post(':id/classes')
  @ApiOperation({ summary: 'Assign classes to a teacher' })
  assignClasses(@Param('id') id: string, @Body() body: AssignClassesDto) {
    return this.teachersService.assignClasses(id, body.classIds);
  }

  // @Post(':id/subjects')
  // @ApiOperation({ summary: 'Assign subjects to a teacher' })
  // assignSubjects(@Param('id') id: string, @Body() body: AssignSubjectsDto) {
  //   return this.teachersService.assignSubjects(id, body.subjectIds);
  // }

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
    return await this.teachersService.removeSubjectFromTeacher(
      teacherId,
      subjectId,
    );
  }
  @Post(':id/subjects')
  @ApiOperation({ summary: 'Assign subjects to a teacher' })
  assignSubjects(@Param('id') id: string, @Body() body: AssignSubjectsDto) {
    return this.teachersService.assignSubjects(id, body.subjectIds);
  }

  @Delete(':id/subjects')
  @ApiOperation({ summary: 'Unassign (remove) subjects from a teacher' })
  @ApiResponse({ status: 200, description: 'Subjects unassigned successfully' })
  @ApiResponse({ status: 404, description: 'Teacher or subjects not found' })
  @ApiResponse({ status: 400, description: 'Invalid subject IDs' })
  unassignSubjects(@Param('id') id: string, @Body() body: UnassignSubjectsDto) {
    return this.teachersService.removeSubjects(id, body.subjectIds);
  }

  @Post('bulk/trash')
  @ApiOperation({ summary: 'Move multiple teachers to trash' })
  bulkTrash(@Body() body: BulkTeacherActionDto) {
    return this.teachersService.bulkTrash(body.ids);
  }

  @Post('bulk/restore')
  @ApiOperation({ summary: 'Restore multiple trashed teachers' })
  bulkRestore(@Body() body: BulkTeacherActionDto) {
    return this.teachersService.bulkRestore(body.ids);
  }

  @Post('bulk/permanent')
  @ApiOperation({ summary: 'Permanently remove multiple trashed teachers' })
  bulkRemovePermanently(@Body() body: BulkTeacherActionDto) {
    return this.teachersService.bulkRemovePermanently(body.ids);
  }

  // ============= ANALYTICS ENDPOINTS =============

  /**
   * Get teacher dashboard welcome stats
   * Returns: total students, total subjects, total classes, total assessments with status breakdown
   * @param teacherId Teacher ID (UUID or ObjectId)
   * @example GET /api/teachers/:id/dashboard-stats
   */
  @Get(':id/dashboard-stats')
  @ApiOperation({
    summary: 'Get teacher dashboard welcome stats',
    description:
      'Returns total classes, students, subjects, and assessments (active/pending/completed) for the teacher dashboard.',
  })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async getDashboardStats(@Param('id') teacherId: string) {
    return this.teachersService.getTeacherDashboardStats(teacherId);
  }

  /**
   * Get all students assigned to teacher's classes
   * @param teacherId Teacher ID
   * @param classId Optional: filter by specific class
   * @param status Optional: filter by status (active, inactive, etc)
   * @param q Optional: search query (name, email, studentId)
   * @param page Pagination page (default: 1)
   * @param limit Pagination limit (default: 20)
   * @example GET /api/teachers/:id/students?classId=xxx&status=active&page=1&limit=20
   */
  @Get(':id/students')
  @ApiOperation({
    summary: 'Get all students assigned to teacher',
    description:
      'Returns list of students across all classes the teacher is assigned to, with optional filters and pagination.',
  })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  @ApiResponse({ status: 200, description: 'Students retrieved' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async getStudents(
    @Param('id') teacherId: string,
    @Query('classId') classId?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.teachersService.getTeacherStudents(teacherId, {
      classId,
      status,
      q,
      page: page || 1,
      limit: limit || 20,
    });
  }

  /**
   * Get all subjects taught by teacher
   * @param teacherId Teacher ID
   * @example GET /api/teachers/:id/subjects
   */
  @Get(':id/subjects-taught')
  @ApiOperation({
    summary: 'Get all subjects taught by teacher',
    description:
      'Returns list of all subjects the teacher is assigned to teach.',
  })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  @ApiResponse({ status: 200, description: 'Subjects retrieved' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async getSubjects(@Param('id') teacherId: string) {
    return this.teachersService.getTeacherSubjects(teacherId);
  }

  /**
   * Get all classes assigned to teacher
   * @param teacherId Teacher ID
   * @example GET /api/teachers/:id/classes-assigned
   */
  @Get(':id/classes-assigned')
  @ApiOperation({
    summary: 'Get all classes assigned to teacher',
    description:
      'Returns list of all classes the teacher is assigned to (as primary teacher or general teacher), including student counts and assigned subjects.',
  })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  @ApiResponse({ status: 200, description: 'Classes retrieved' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async getClasses(@Param('id') teacherId: string) {
    return this.teachersService.getTeacherClasses(teacherId);
  }

  /**
   * Get all assessments created by teacher
   * @param teacherId Teacher ID
   * @param subjectId Optional: filter by subject
   * @param classId Optional: filter by class
   * @param status Optional: filter by status (active, pending, completed, trashed)
   * @param page Pagination page (default: 1)
   * @param limit Pagination limit (default: 20)
   * @example GET /api/teachers/:id/assessments?subjectId=xxx&classId=yyy&status=active&page=1&limit=20
   */
  @Get(':id/assessments')
  @ApiOperation({
    summary: 'Get all assessments created by teacher',
    description:
      'Returns list of assessments created by the teacher with optional filters for subject, class, and status. Includes status summary (active, pending, completed, trashed).',
  })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  @ApiResponse({ status: 200, description: 'Assessments retrieved' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async getAssessments(
    @Param('id') teacherId: string,
    @Query('subjectId') subjectId?: string,
    @Query('classId') classId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.teachersService.getTeacherAssessments(teacherId, {
      subjectId,
      classId,
      status,
      page: page || 1,
      limit: limit || 20,
    });
  }

  /**
   * Get all assignments created by teacher
   * @param teacherId Teacher ID
   * @param subjectId Optional: filter by subject
   * @param classId Optional: filter by class
   * @param academicYear Optional: filter by academic year
   * @param term Optional: filter by term
   * @param page Pagination page (default: 1)
   * @param limit Pagination limit (default: 20)
   * @example GET /api/teachers/:id/assignments?subjectId=xxx&classId=yyy&academicYear=2024/2025&term=1&page=1&limit=20
   */
  @Get(':id/assignments')
  @ApiOperation({
    summary: 'Get all assignments created by teacher',
    description:
      'Returns list of assignments created by the teacher with optional filters for subject, class, academic year, and term. Includes status summary (pending, submitted, graded, late).',
  })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  @ApiResponse({ status: 200, description: 'Assignments retrieved' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async getAssignments(
    @Param('id') teacherId: string,
    @Query('subjectId') subjectId?: string,
    @Query('classId') classId?: string,
    @Query('academicYear') academicYear?: string,
    @Query('term') term?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.teachersService.getTeacherAssignments(teacherId, {
      subjectId,
      classId,
      academicYear,
      term,
      page: page || 1,
      limit: limit || 20,
    });
  }

  //get teacher using user id 
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get teacher using user ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Teacher retrieved' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async getTeacherByUserId(@Param('userId') userId: string) {
    return this.teachersService.getTeacherByUserId(userId);
  }
}
