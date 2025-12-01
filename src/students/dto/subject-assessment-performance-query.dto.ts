import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class SubjectAssessmentPerformanceQueryDto {
  @ApiPropertyOptional({
    description:
      'Filter results by term ID. Use "all" to include every available term.',
    example: '655f7a0e7b3c2f4a1c9d1234',
  })
  @IsOptional()
  @IsMongoId()
  termId?: string;

  @ApiPropertyOptional({
    description:
      'Filter results by academic year ID. Use "all" to include every year.',
    example: '655f79fd7b3c2f4a1c9d5678',
  })
  @IsOptional()
  @IsMongoId()
  academicYearId?: string;

  @ApiPropertyOptional({
    description:
      'Limit results to a specific student. Use "all" to include every student.',
  })
  @IsOptional()
  @IsString()
  studentId?: string;
}


