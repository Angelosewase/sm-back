import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AssessmentFilterDto {
  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  academicYear?: string;
  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  term?: string;
  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  teacher?: string;
  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  subject?: string;
  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  class?: string;
  @ApiPropertyOptional({
    example: 'active',
    enum: ['active', 'trashed', 'deleted', 'locked'],
  })
  @IsString()
  @IsOptional()
  status?: string;
  @ApiPropertyOptional({ example: 'Quiz' })
  @IsString()
  @IsOptional()
  assessmentType?: string;
  @ApiPropertyOptional({ example: '2025-11-01', type: String })
  @IsString()
  @IsOptional()
  deadlineStart?: string;
  @ApiPropertyOptional({ example: '2025-11-30', type: String })
  @IsString()
  @IsOptional()
  deadlineEnd?: string;
  @ApiPropertyOptional({ example: 1, type: Number })
  @IsOptional()
  page?: number;
  @ApiPropertyOptional({ example: 10, type: Number })
  @IsOptional()
  pageSize?: number;
}
