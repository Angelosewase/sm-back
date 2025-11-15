// src/term/term.controller.ts
import { Controller, Get, Patch, Param, BadRequestException } from '@nestjs/common';
import { TermService } from './terms.service';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';

@ApiTags('Terms')
@Controller('terms')
export class TermController {
  constructor(private readonly service: TermService) {}

  @Get('academic-year/:academicYearId')
  @ApiOperation({ summary: 'Get all terms for an academic year' })
  @ApiParam({ name: 'academicYearId', description: 'Academic year ID' })
  findByAcademicYear(@Param('academicYearId') academicYearId: string) {
    return this.service.findByAcademicYear(academicYearId);
  }

  @Get('academic-year/:academicYearId/open')
  @ApiOperation({ summary: 'Get the currently open term for an academic year' })
  @ApiParam({ name: 'academicYearId', description: 'Academic year ID' })
  getOpenTerm(@Param('academicYearId') academicYearId: string) {
    return this.service.getOpenTerm(academicYearId);
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Get term by ID' })
  @ApiParam({ name: 'id', description: 'Term ID' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch('academic-year/:academicYearId/term/:order/open')
  @ApiOperation({ summary: 'Open a term (closes any currently open term)' })
  @ApiParam({ name: 'academicYearId', description: 'Academic year ID' })
  @ApiParam({ name: 'order', description: 'Term order (1, 2, or 3)' })
  openTerm(
    @Param('academicYearId') academicYearId: string,
    @Param('order') order: string,
  ) {
    const termOrder = parseInt(order, 10);
    if (isNaN(termOrder) || termOrder < 1 || termOrder > 3) {
      throw new BadRequestException('Term order must be 1, 2, or 3');
    }
    return this.service.openTerm(academicYearId, termOrder);
  }

  @Patch('academic-year/:academicYearId/term/:order/close')
  @ApiOperation({ summary: 'Close a term' })
  @ApiParam({ name: 'academicYearId', description: 'Academic year ID' })
  @ApiParam({ name: 'order', description: 'Term order (1, 2, or 3)' })
  closeTerm(
    @Param('academicYearId') academicYearId: string,
    @Param('order') order: string,
  ) {
    const termOrder = parseInt(order, 10);
    if (isNaN(termOrder) || termOrder < 1 || termOrder > 3) {
      throw new BadRequestException('Term order must be 1, 2, or 3');
    }
    return this.service.closeTerm(academicYearId, termOrder);
  }
}