import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';
import { StudentPerformanceFilters } from '../student-performance.service';

export class StudentPerformanceQueryDto
  implements StudentPerformanceFilters
{
  @ApiPropertyOptional({
    description: 'Filter results by academic year, e.g. "2023/2024". Use "all" to include every year.',
  })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({
    description:
      'Filter results by term. Supports arbitrary term naming. Use "all" to include every term.',
  })
  @IsOptional()
  @IsString()
  term?: string;

  @ApiPropertyOptional({
    description: 'Limit results to a specific subject.',
  })
  @IsOptional()
  @IsMongoId()
  subjectId?: string;

  @ApiPropertyOptional({
    description: 'Limit results to a specific class.',
  })
  @IsOptional()
  @IsMongoId()
  classId?: string;

  @ApiPropertyOptional({
    description: 'Limit results to a specific assessment.',
  })
  @IsOptional()
  @IsMongoId()
  assessmentId?: string;

  @ApiPropertyOptional({
    description:
      'Filter results by assessment type, e.g. "Exam", "Quiz", or any custom value.',
  })
  @IsOptional()
  @IsString()
  assessmentType?: string;
}


