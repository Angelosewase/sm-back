// analytics-query.dto.ts
import { IsOptional, IsMongoId, IsString, IsIn } from 'class-validator';

export class PerformanceQueryDto {
  @IsOptional() @IsMongoId() schoolId?: string;
  @IsOptional() @IsMongoId() classId?: string;
  @IsOptional() @IsString() academicYear?: string; // "2024/2025"
  @IsOptional() @IsMongoId() termId?: string;
  @IsOptional() @IsIn(['term', 'year', 'all']) scope?: 'term' | 'year' | 'all';
}