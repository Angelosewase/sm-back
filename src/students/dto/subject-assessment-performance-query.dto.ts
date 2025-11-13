import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SubjectAssessmentPerformanceQueryDto {
  @ApiPropertyOptional({
    description:
      'Filter results by term. Use "all" to include every available term.',
    example: '1',
  })
  @IsOptional()
  @IsString()
  term?: string;

  @ApiPropertyOptional({
    description:
      'Filter results by academic year. Use "all" to include every year.',
    example: '2024',
  })
  @IsOptional()
  @IsString()
  year?: string;

  @ApiPropertyOptional({
    description:
      'Limit results to a specific student. Use "all" to include every student.',
  })
  @IsOptional()
  @IsString()
  studentId?: string;
}


