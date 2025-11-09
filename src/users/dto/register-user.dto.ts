import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Role } from '../schemas/user.schema';
import { Type } from 'class-transformer';

export class RegisterDto {
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
    enum: Role,
    example: Role.STUDENT,
    description: 'User role (defaults to STAFF if not provided)',
    required: false,
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({
    example: '+1-123-456-7890',
    description: 'Phone number of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Reference to the associated school (optional for initial registration)',
    required: false,
  })
  @IsOptional()
  @IsString()
  school?: string;

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
    example: 'Springfield',
    description: 'City of residence',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    example: 'Illinois',
    description: 'State or region of residence',
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    example: '62704',
    description: 'Postal or ZIP code',
    required: false,
  })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiProperty({
    example: 'Jane Doe - +1-555-987-6543',
    description: 'Emergency contact details',
    required: false,
  })
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @ApiProperty({
    example: 'Prefers online meetings in the afternoon',
    description: 'Additional notes about the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  additionalNotes?: string;
}