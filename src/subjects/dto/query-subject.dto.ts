import { GradeLevel } from '../schemas/subject.schema';

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  IsEmail,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { booleanTransformer } from 'src/classes/dto/query-classes.dto';

export class QuerySubjectDto {
  @ApiPropertyOptional({
    description: 'Search text across name, location, address, contactEmail',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by exact school ID' })
  @IsOptional()
  @IsString()
  school?: string;

  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 10,
    maximum: 100,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort by field (e.g., name, createdAt)',
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order asc|desc', default: 'desc' })
  @IsOptional()
  @IsString()
  @IsEnum(['asc', 'desc'] as any)
  order?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'Filter by grade level',
    enum: GradeLevel,
  })
  @IsOptional()
  @IsString()
  gradeLevel?: GradeLevel;

  @ApiPropertyOptional({
    description: 'Include trashed subjects in the results',
    example: false,
  })
  @IsOptional()
  @Transform(booleanTransformer)
  @IsBoolean()
  includeTrashed?: boolean;

  @ApiPropertyOptional({
    description: 'Return only trashed subjects',
    example: false,
  })
  @IsOptional()
  @Transform(booleanTransformer)
  @IsBoolean()
  onlyTrashed?: boolean;

  @ApiPropertyOptional({ description: 'Filter by subject type' })
  @IsOptional()
  @IsString()
  subjectType?: string;
}
