import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { Role } from '../schemas/user.schema';

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
}