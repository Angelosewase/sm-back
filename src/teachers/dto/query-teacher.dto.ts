import { OmitType } from '@nestjs/mapped-types';
import { QueryUserDto } from '../../users/dto/query-user.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryTeacherDto extends OmitType(QueryUserDto, ['role'] as const) {
  @ApiPropertyOptional({
    description: 'Filter by teacher status',
    enum: ['Active', 'On Leave', 'Inactive'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by department',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'Filter by subject identifier (subjectsCanTeach)',
  })
  @IsOptional()
  @IsMongoId()
  subjectId?: string;

  @ApiPropertyOptional({
    description: 'Filter by class identifier (assignedClasses)',
  })
  @IsOptional()
  @IsMongoId()
  classId?: string;

  @ApiPropertyOptional({
    description: 'Include trashed teachers in results',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  includeTrashed?: boolean;

  @ApiPropertyOptional({
    description: 'Return only trashed teachers',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  onlyTrashed?: boolean;
}

