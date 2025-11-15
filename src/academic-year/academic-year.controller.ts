// src/academic-year/academic-year.controller.ts
import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { AcademicYearService } from './academic-year.service';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';

@ApiTags('Academic Years')
@Controller('academic-years')
export class AcademicYearController {
  constructor(private readonly service: AcademicYearService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new academic year' })
  create(@Body() createDto: CreateAcademicYearDto) {
    return this.service.create({
      label: createDto.label,
      startDate: createDto.startDate ? new Date(createDto.startDate) : undefined,
      endDate: createDto.endDate ? new Date(createDto.endDate) : undefined,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all academic years' })
  findAll() {
    return this.service.findAll();
  }

  @Get('open')
  @ApiOperation({ summary: 'Get the currently open academic year' })
  getOpen() {
    return this.service.getOpen();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get academic year by ID' })
  @ApiParam({ name: 'id', description: 'Academic year ID' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id/open')
  @ApiOperation({ summary: 'Open an academic year (closes any currently open year)' })
  @ApiParam({ name: 'id', description: 'Academic year ID' })
  open(@Param('id') id: string) {
    return this.service.open(id);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Close an academic year' })
  @ApiParam({ name: 'id', description: 'Academic year ID' })
  close(@Param('id') id: string) {
    return this.service.close(id);
  }
}