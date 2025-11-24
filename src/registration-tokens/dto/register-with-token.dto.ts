import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterWithTokenDto {
  @ApiProperty({
    example: 'abc123def456',
    description: 'Registration token',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Unique email address for the user',
  })
  @IsEmail()
  @IsString()
  email: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'Password for the user account',
    minLength: 8,
  })
  @MinLength(8)
  @IsString()
  password: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: '+1-123-456-7890',
    description: 'Phone number of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 3,
    description: 'Total years of teaching or professional experience',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @ApiProperty({
    example: ['B.Ed', 'TESOL Certificate'],
    description: 'List of qualifications or certifications',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  qualifications?: string[];

  @ApiProperty({
    example: '123 Main St',
    description: 'Street address',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    example: 'New York',
    description: 'City of residence',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    example: 'NY',
    description: 'State or region of residence',
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    example: '10001',
    description: 'Postal or ZIP code',
    required: false,
  })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiProperty({
    example: '+1-987-654-3210',
    description: 'Emergency contact information',
    required: false,
  })
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @ApiProperty({
    example: 'Additional notes about the user',
    description: 'Additional notes about the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  additionalNotes?: string;

  // School-specific fields for SCHOOL_OWNER
  @ApiProperty({
    example: 'My School Name',
    description: 'School name (required for SCHOOL_OWNER role)',
    required: false,
  })
  @IsOptional()
  @IsString()
  schoolName?: string;

  @ApiProperty({
    example: 'Primary',
    description: 'School type (required for SCHOOL_OWNER role)',
    required: false,
  })
  @IsOptional()
  @IsString()
  schoolType?: string;

  @ApiProperty({
    example: 2020,
    description: 'Year school was established (required for SCHOOL_OWNER role)',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  establishedYear?: number;

  @ApiProperty({
    example: 500,
    description: 'Student capacity (required for SCHOOL_OWNER role)',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  studentCapacity?: number;

  @ApiProperty({
    example: 'A great school',
    description: 'School description',
    required: false,
  })
  @IsOptional()
  @IsString()
  schoolDescription?: string;

  @ApiProperty({
    example: '123 School Street',
    description: 'School address',
    required: false,
  })
  @IsOptional()
  @IsString()
  schoolAddress?: string;

  @ApiProperty({
    example: 'New York',
    description: 'School city',
    required: false,
  })
  @IsOptional()
  @IsString()
  schoolCity?: string;

  @ApiProperty({
    example: 'Manhattan',
    description: 'School district',
    required: false,
  })
  @IsOptional()
  @IsString()
  schoolDistrict?: string;

  @ApiProperty({
    example: '+1-123-456-7890',
    description: 'School phone number',
    required: false,
  })
  @IsOptional()
  @IsString()
  schoolPhoneNumber?: string;

  @ApiProperty({
    example: 'info@school.com',
    description: 'School email',
    required: false,
  })
  @IsOptional()
  @IsString()
  schoolEmail?: string;

  @ApiProperty({
    example: 'https://school.com',
    description: 'School website',
    required: false,
  })
  @IsOptional()
  @IsString()
  schoolWebsite?: string;
}

