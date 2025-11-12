import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTeacherDto {
  // User fields
  @ApiProperty({ example: 'teacher@example.com' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'password' })
  @IsString()
  password: string;

  @ApiProperty({ example: 'John Teacher' })
  @IsString()
  name: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '5 years', required: false })
  @IsOptional()
  @IsString()
  experience?: string;

  @ApiProperty({ example: 'schoolId' })
  @IsString()
  school: string;

  // Teacher-specific
  @ApiProperty({ example: 'T001', required: false })
  @IsOptional()
  @IsString()
  teacherId?: string;

  @ApiProperty({ example: ['subjectId1'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjectsCanTeach?: string[];

  @ApiProperty({ example: 'Science Department', required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ example: ['classId1'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedClasses?: string[];

  @ApiProperty({ example: 'M.Ed.', required: false })
  @IsOptional()
  @IsString()
  qualification?: string;

  @ApiProperty({ example: '2023-01-01', required: false })
  @IsOptional()
  @IsDateString()
  hireDate?: Date;

  @ApiProperty({ enum: ['Active', 'On Leave', 'Inactive'], required: false })
  @IsOptional()
  @IsEnum(['Active', 'On Leave', 'Inactive'])
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  zip?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

}
