import {
  Controller,
  Post,
  Put,
  Delete,
  Get,
  Query,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { AssessmentService } from './assessment.service';
import { AssessmentFilterDto } from './dto/assessment-filter-dto';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';

@ApiTags('Assessments')
@Controller('api/assessments')
export class AssessmentController {
  constructor(private readonly service: AssessmentService) {}

  @Post()
  @ApiOperation({ summary: 'Create assessment' })
  @ApiResponse({ status: 201, description: 'Assessment created.' })
  async create(@Body() dto: CreateAssessmentDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update assessment' })
  @ApiResponse({ status: 200, description: 'Assessment updated.' })

  async update(@Param('id') id: string, @Body() dto: UpdateAssessmentDto) {
    return this.service.update(id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List assessments with filter, search, and pagination',
  })
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiQuery({ name: 'term', required: false })
  @ApiQuery({ name: 'subject', required: false })
  @ApiQuery({ name: 'class', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assessmentType', required: false })
  @ApiQuery({ name: 'deadlineStart', required: false })
  @ApiQuery({ name: 'deadlineEnd', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiResponse({ status: 200, description: 'List of assessments.' })
  async findAll(@Query() filter: AssessmentFilterDto) {
    return this.service.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assessment details' })
  @ApiResponse({ status: 200, description: 'Assessment details.' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/soft-delete')
  @ApiOperation({ summary: 'Trash assessment (soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Assessment status updated to trashed.',
  })
  async softDelete(@Param('id') id: string) {
    return this.service.softDelete(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete assessment' })
  @ApiResponse({ status: 200, description: 'Assessment permanently deleted.' })
  async permanentlyDelete(@Param('id') id: string) {
    return this.service.permanentlyDelete(id);
  }

  @Get(':id/performance')
  @ApiOperation({
    summary:
      'Assessment analytics (current submissions, available, performance)',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance stats for assessment.',
  })
  async getPerformance(@Param('id') id: string) {
    return this.service.getPerformance(id);
  }

  @Get('subject/:subjectId/performance')
  @ApiOperation({
    summary: 'Analytics for subject assessments (performance across all types)',
  })
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiQuery({ name: 'term', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @ApiResponse({ status: 200, description: 'Subject performance stats.' })
  async getSubjectPerformance(
    @Param('subjectId') subjectId: string,
    @Query('academicYear') academicYear?: string,
    @Query('term') term?: string,
    @Query('classId') classId?: string,
  ) {
    return this.service.getSubjectPerformance(
      subjectId,
      academicYear,
      term,
      classId,
    );
  }

  @Get('class/:classId/performance')
  @ApiOperation({
    summary: 'Analytics for class assessments (performance over all subjects)',
  })
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiQuery({ name: 'term', required: false })
  @ApiResponse({ status: 200, description: 'Class performance stats.' })
  async getClassPerformance(
    @Param('classId') classId: string,
    @Query('academicYear') academicYear?: string,
    @Query('term') term?: string,
  ) {
    return this.service.getClassPerformance(classId, academicYear, term);
  }
}
