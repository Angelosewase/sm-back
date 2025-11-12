import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GuardianRelationShip, StudentStatus } from '../schemas/student.schema';

export class CreateStudentDto {
  @ApiProperty({ description: 'School unique studentId/admission number' })
  @IsNotEmpty()
  @IsString()
  studentId: string;

  @ApiProperty({ description: 'Full name of the student' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Class ObjectId', type: String })
  @IsOptional()
  @IsMongoId()
  classId?: string;

  @ApiPropertyOptional({ example: 'student@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+15555555555' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Date of birth in ISO 8601 format' })
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiPropertyOptional({ example: 'female' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Previous school name' })
  @IsOptional()
  @IsString()
  previousSchool?: string;

  @ApiPropertyOptional({ description: 'District name' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: 'Province or state name' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: 'Grade level label' })
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @ApiPropertyOptional({ description: 'Enrollment date in ISO 8601 format' })
  @IsOptional()
  @IsDateString()
  enrollmentDate?: string;

  @ApiPropertyOptional({ description: 'Guardian full name' })
  @IsOptional()
  @IsString()
  guardianName?: string;

  @ApiPropertyOptional({ description: 'Guardian phone number' })
  @IsOptional()
  @IsString()
  guardianPhoneNumber?: string;

  @ApiPropertyOptional({ description: 'Guardian email address' })
  @IsOptional()
  @IsEmail()
  guardianEmail?: string;

  @ApiPropertyOptional({
    enum: GuardianRelationShip,
    default: GuardianRelationShip.GUARDIAN,
  })
  @IsOptional()
  @IsEnum(GuardianRelationShip)
  guardianRelationShip?: GuardianRelationShip;

  @ApiPropertyOptional({ description: 'Guardian emergency contact number' })
  @IsOptional()
  @IsString()
  guardianEmergencyContact?: string;

  @ApiPropertyOptional({ description: 'Medical information for the student' })
  @IsOptional()
  @IsString()
  medicalInformation?: string;

  @ApiPropertyOptional({ description: 'Additional notes about the student' })
  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @ApiPropertyOptional({ enum: StudentStatus, default: StudentStatus.ACTIVE })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiPropertyOptional({ description: 'School ObjectId', type: String })
  @IsOptional()
  @IsMongoId()
  schoolId?: string;

  @ApiPropertyOptional({ description: 'Trash flag for soft delete' })
  @IsOptional()
  @IsBoolean()
  isTrashed?: boolean;
}
