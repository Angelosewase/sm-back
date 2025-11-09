import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTeacherDto {
  @ApiPropertyOptional({ description: 'Updated teacher name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Updated teacher email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Updated teacher phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Identifier of the school the teacher belongs to' })
  @IsOptional()
  @IsString()
  school?: string;

  @ApiPropertyOptional({ description: 'Updated years of experience for the teacher', example: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @ApiPropertyOptional({
    description: 'Updated list of teacher qualifications',
    type: [String],
    example: ['B.Ed', 'Certified Math Instructor'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  qualifications?: string[];

  @ApiPropertyOptional({ description: 'Updated address of the teacher' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Updated city for the teacher address' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Updated state for the teacher address' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Updated postal or ZIP code for the teacher' })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional({ description: 'Updated emergency contact information' })
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @ApiPropertyOptional({ description: 'Updated additional notes about the teacher' })
  @IsOptional()
  @IsString()
  additionalNotes?: string;
}


