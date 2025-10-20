import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { SubjectService } from '../services/subject.service';
import { CreateSubjectDto } from '../dto/create-subject.dto';

@Controller('subjects')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Post()
  async create(@Body() dto: CreateSubjectDto) {
    return this.subjectService.createSubject(dto);
  }

  @Get()
  async list(@Query() query: any) {
    const filter: any = {};
    if (query.school) filter.school = query.school;
    return this.subjectService.listSubjects(filter);
  }
}
