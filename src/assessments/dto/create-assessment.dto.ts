
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsMongoId,
  IsDate,
  IsNumber,
} from 'class-validator';
import { AssessmentType } from '../schemas/assessment-schema';

export class CreateAssessmentDto {
  @ApiProperty({ type: String, description: 'Academic Year ID' })
  @IsMongoId()
  academicYear: string;

  @ApiProperty({ type: String, description: 'Term ID' })
  @IsMongoId()
  term: string;

  @ApiProperty({ type: String, description: 'Subject ID' })
  @IsMongoId()
  subject: string;

  @ApiProperty({ type: String, description: 'Class ID' })
  @IsMongoId()
  class: string;

  @ApiProperty({ example: 'Math Quiz 1' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'A short quiz on algebra' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of questions in the assessment',
  })
  @IsNumber()
  @IsOptional()
  weight?: number;

  @ApiProperty({
    enum: Object.values(AssessmentType),
    example: 'Quiz',
    description: 'Type of assessment',
  })
  @IsEnum(AssessmentType)
  AssessmentType: AssessmentType;

  @ApiProperty({
    description: 'Deadline for the assessment',
    example: '2025-11-13T12:00:00Z',
  })
  @IsDate()
  deadline: Date;

  @ApiProperty({ example: 100, type: Number })
  @IsOptional()
  maxScore?: number;
}
