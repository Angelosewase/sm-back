import { Controller, Post, Body, Get, Query, Param, Patch, UseGuards, Delete } from '@nestjs/common';
import { SubjectService } from '../services/subject.service';
import { CreateSubjectDto } from '../dto/create-subject.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UpdateSubjectDto } from '../dto/update-subject.dto';

@ApiTags('Subjects')
@Controller('subjects')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @ApiBearerAuth('access-token')
  @ApiOkResponse({description: 'Successfully created subject'})
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateSubjectDto) {
    return this.subjectService.createSubject(dto);
  }

  // @ApiBearerAuth('access-token')
  @ApiOkResponse({description: 'Successfully fetched subjects'})
  // @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Query() query: any) {
    const filter: any = {};
    if (query.school) filter.school = query.school;
    return this.subjectService.listSubjects(filter);
  }

  @ApiBearerAuth('access-token')
  @ApiOkResponse({description: 'Successfully fetched subject'})
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async get(@Param('id') id: string) {
    return this.subjectService.getSubjectById(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({description: 'Successfully updated subject'})
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjectService.updateSubject(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({description:"Successfully deleted subject"})
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.subjectService.deleteSubject(id);
  }

}
