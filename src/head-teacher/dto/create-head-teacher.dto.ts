import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateHeadTeacherDto {
  @ApiProperty({
    description: 'Unique email address for the teacher',
    example: 'teacher@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password for the teacher account (minimum 8 characters)',
    example: 'StrongPass123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'Full name of the teacher',
    example: 'Alex Smith',
  })
  @IsOptional()
  @IsString()
  name?: string;

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
  school?: string;
}


