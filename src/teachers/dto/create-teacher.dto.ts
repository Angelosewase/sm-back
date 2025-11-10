import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTeacherDto {
  @ApiPropertyOptional({
    description: 'Full name of the teacher',
    example: 'Alex Smith',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Unique email address for the teacher',
    example: 'teacher@example.com',
  })
  @IsEmail()
  email: string;


  @ApiPropertyOptional({
    description: 'Teacher phone number',
    example: '+1-555-123-4567',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Identifier of the school the teacher belongs to',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  school: string;

  @ApiPropertyOptional({
    description: 'Number of years the teacher has been teaching',
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @ApiPropertyOptional({
    description: 'List of teacher qualifications',
    example: ['B.Ed', 'M.Ed'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  qualifications?: string[];

  @ApiPropertyOptional({
    description: 'Street address of the teacher',
    example: '123 Main St',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'City where the teacher resides',
    example: 'Springfield',
  })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({
    description: 'State where the teacher resides',
    example: 'California',
  })
  @IsOptional()
  @IsString()
  district?: string;


  @ApiPropertyOptional({
    description: 'Emergency contact information for the teacher',
    example: 'Jane Doe - +1-555-987-6543',
  })
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the teacher',
    example: 'Prefers morning classes',
  })
  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @ApiPropertyOptional({
    description: 'Departement of the teacher',
    example: 'science',
  })
  @IsOptional()
  @IsString()
  department?: string;



}


