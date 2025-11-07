import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber, MaxLength, IsPositive } from 'class-validator';

export class CreateClassDto {
  @ApiProperty({
    example: 'P4A',
    description: 'The unique name of the class, typically including grade and section.',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  name: string;

  @ApiProperty({
    required: false,
    example: 'CLS-P4A',
    description: 'Optional class code used internally for identification.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

  @ApiProperty({
    description: 'The unique identifier (_id) of the school this class belongs to.',
    example: '68f79d534286e66c8b4ad219',
  })
  @IsNotEmpty()
  @IsString()
  school: string; // ObjectId reference

  @ApiProperty({
    example: '2024/2025',
    description: 'Academic year during which the class is active.',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(15)
  academicYear: string;

  @ApiProperty({
    required: false,
    example: 'Primary 4',
    description: 'The educational level of the class.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  level?: string;

  @ApiProperty({
    required: false,
    example: 'General Studies',
    description: 'The academic program or stream of the class (e.g., Science, Arts).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  program?: string;

  @ApiProperty({
    required: false,
    example: 40,
    description: 'The maximum number of students that can be enrolled in this class.',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  capacity?: number;
}
