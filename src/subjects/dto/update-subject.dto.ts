import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, MaxLength, IsArray } from 'class-validator';

export class UpdateSubjectDto {
  @ApiProperty({ required: false, example: 'Mathematics' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false, example: 'MATH101' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

  @ApiProperty({ required: false, example: 'Math' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  shortName?: string;

  @ApiProperty({ required: false, example: 100 })
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

  @ApiProperty({ required: false, example: 50 })
  @IsOptional()
  @IsNumber()
  minPassingScore?: number;

  @ApiProperty({ required: false, example: '68f79d534286e66c8b4ad219' })
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
    example: 'Grade 10',
    description: 'Grade level',
  })
  @IsOptional()
  @IsArray()
  gradeLevels?: string[];

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

  @ApiProperty({
    required: false,
    example: 'class description',
    description: 'Description of the class',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
