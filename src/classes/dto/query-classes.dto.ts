import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

const booleanTransformer = ({
  value,
}: TransformFnParams): boolean | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'string') {
    return value.trim().toLowerCase() === 'true';
  }

  return value === true;
};

export class QueryClassesDto {
  @ApiProperty({ description: 'Page number', required: false, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(100)
  limit?: number;

  @ApiProperty({
    description: 'Search term applied to class name or description',
    required: false,
    example: 'math',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  search?: string;

  @ApiProperty({
    description: 'Filter classes by grade level',
    required: false,
    example: 'Grade 6',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  gradeLevel?: string;

  @ApiPropertyOptional({
    description: 'School _id to filter classes',
    example: '68f79d534286e66c8b4ad219',
  })
  @IsOptional()
  @IsString()
  school?: string;

  @ApiPropertyOptional({
    description: 'Academic year to filter classes',
    example: '2024/2025',
  })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({
    description: 'Include trashed classes in the results',
    example: false,
  })
  @IsOptional()
  @Transform(booleanTransformer)
  @IsBoolean()
  includeTrashed?: boolean;

  @ApiPropertyOptional({
    description: 'Return only trashed classes',
    example: false,
  })
  @IsOptional()
  @Transform(booleanTransformer)
  @IsBoolean()
  onlyTrashed?: boolean;

  @ApiPropertyOptional({
    description: 'Include teacher profile for each class',
    example: false,
  })
  @IsOptional()
  @Transform(booleanTransformer)
  @IsBoolean()
  includeTeacherProfile?: boolean;

  @ApiPropertyOptional({
    description: 'Include subjects assigned to each class',
    example: false,
  })
  @IsOptional()
  @Transform(booleanTransformer)
  @IsBoolean()
  includeSubjects?: boolean;
}
