import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { SubjectType } from '../schemas/subject.schema';

export class CreateSubjectDto {
  @ApiProperty({
    example: 'Mathematics',
    description: 'The full name of the subject being taught.',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  subjectName: string;

  @ApiProperty({
    required: false,
    example: 'MATH101',
    description:
      'An optional subject code used for internal reference or reports.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  subjectCode?: string;

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
    example: 'Core',
    description:
      'Category of the subject as used on the frontend (Core/Elective/Optional).',
  })
  @IsOptional()
  @IsString()
  category?: string;

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

  @ApiProperty({
    required: false,
    example: 'Science',
    description: 'Department name',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({
    required: false,
    example: 3,
    description: 'Credit hours for the subject',
  })
  @IsOptional()
  @IsNumber()
  creditHours?: number;

  @ApiProperty({ required: false, example: 'Beginner', description: 'Level' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiProperty({
    required: false,
    example: 'Grade 10',
    description: 'Grade level',
  })
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @ApiProperty({
    required: false,
    example: 'Active',
    description: 'Status: Active | Inactive',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    required: false,
    example: 'Basic Mathematics',
    description: 'Prerequisites',
  })
  @IsOptional()
  @IsString()
  prerequisites?: string;
}
