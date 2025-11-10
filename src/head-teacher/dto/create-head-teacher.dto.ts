import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
// Similar but with department, fewer class fields
export class CreateHeadTeacherDto {
  @ApiProperty({ example: 'head@example.com' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'password' })
  @IsString()
  password: string;

  @ApiProperty({ example: 'John Head' })
  @IsString()
  name: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '10 years', required: false })
  @IsOptional()
  @IsString()
  experience?: string;

  @ApiProperty({ example: 'schoolId' })
  @IsString()
  school: string;

  // HeadTeacher-specific
  @ApiProperty({ example: 'HT001', required: false })
  @IsOptional()
  @IsString()
  headTeacherId?: string;

  @ApiProperty({ example: 'Mathematics', description: 'Department' })
  @IsString()
  department: string; // Required for head teacher

  @ApiProperty({ example: ['subjectId1'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];

  @ApiProperty({ example: 'Ph.D.', required: false })
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