import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

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


  @ApiPropertyOptional({ description: 'School _id to filter classes', example: '68f79d534286e66c8b4ad219' })
  @IsOptional()
  @IsString()
  school?: string;

  @ApiPropertyOptional({ description: 'Academic year to filter classes', example: '2024/2025' })
  @IsOptional()
  @IsString()
  academicYear?: string;
 }

