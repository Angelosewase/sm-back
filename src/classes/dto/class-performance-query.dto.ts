import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsInt,
  Min,
} from 'class-validator';

export class ClassPerformanceQueryDto {
  @ApiPropertyOptional({ description: 'Academic year label (e.g. 2024/2025)' })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({
    description: 'Term id or label (require academicYear if provided)',
  })
  @IsOptional()
  @IsString()
  term?: string;

  @ApiPropertyOptional({
    description:
      'Filter by assessment type (e.g. Quiz, Exam, Test, Homework, Classwork)',
  })
  @IsOptional()
  @IsString()
  assessmentType?: string;

  @ApiPropertyOptional({ description: 'Filter by multiple assessment types' })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  assessmentTypes?: string[];

  @ApiPropertyOptional({
    description: 'ISO date string to limit start of period (inclusive)',
  })
  @IsOptional()
  @IsString()
  periodStart?: string;

  @ApiPropertyOptional({
    description: 'ISO date string to limit end of period (inclusive)',
  })
  @IsOptional()
  @IsString()
  periodEnd?: string;

  @ApiPropertyOptional({
    description:
      'Return weekly breakdown for assessments in a term (number of weeks to look back)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  weeks?: number;

  @ApiPropertyOptional({
    description: 'Group by: academicYear | term | assessmentType',
  })
  @IsOptional()
  @IsString()
  groupBy?: string;
}
