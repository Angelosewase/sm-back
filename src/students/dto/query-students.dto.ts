import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GuardianRelationShip, StudentStatus } from '../schemas/student.schema';

export class QueryStudentsDto {
  @ApiPropertyOptional({ description: 'Page number (1-indexed)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;

  @ApiPropertyOptional({ description: 'Free text search on name or studentId' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: StudentStatus })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiPropertyOptional({ enum: GuardianRelationShip })
  @IsOptional()
  @IsEnum(GuardianRelationShip)
  guardianRelationShip?: GuardianRelationShip;

  @ApiPropertyOptional({ description: 'Filter by district name' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: 'Filter by province name' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: 'Filter by grade level' })
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @ApiPropertyOptional({ description: 'Filter by guardian email address' })
  @IsOptional()
  @IsString()
  guardianEmail?: string;

  @ApiPropertyOptional({ description: 'Filter by class ObjectId', type: String })
  @IsOptional()
  @IsMongoId()
  classId?: string;

  @ApiPropertyOptional({ description: 'Filter by school ObjectId', type: String })
  @IsOptional()
  @IsMongoId()
  schoolId?: string;

  @ApiPropertyOptional({
    description: 'Include soft-deleted students in results',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeTrashed?: boolean = false;

  @ApiPropertyOptional({
    description: 'Return only soft-deleted students',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onlyTrashed?: boolean = false;

  @ApiPropertyOptional({
    description: 'Sort field',
    default: 'createdAt',
    example: 'name',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order direction',
    default: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

