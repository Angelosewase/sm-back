import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  MaxLength,
} from 'class-validator';

export class UpdateSubjectDto {
  @ApiProperty({
    example: 'Mathematics',
    description: 'The full name of the subject being taught.',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @ApiProperty({
    required: false,
    example: 'MATH101',
    description:
      'An optional subject code used for internal reference or reports.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

  @ApiProperty({
    required: false,
    example: 'Math',
    description: 'Short version or abbreviation of the subject name.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  shortName?: string;

  @ApiProperty({
    required: false,
    example: 100,
    description: 'The maximum score attainable in the subject.',
  })
  @IsOptional()
  @IsNumber()
  maxScore?: number;

  @ApiProperty({
    required: false,
    example: 50,
    description: 'The minimum score required to pass the subject.',
  })
  @IsOptional()
  @IsNumber()
  minPassingScore?: number;

  @ApiProperty({
    required: false,
    example: '68f79d534286e66c8b4ad219',
    description: 'The school _id this subject belongs to.',
  })
  @IsOptional()
  @IsString()
  school?: string;
}
