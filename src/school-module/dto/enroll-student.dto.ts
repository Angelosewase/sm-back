import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnrollStudentDto {
  @ApiProperty({ description: 'Class _id' })
  @IsNotEmpty()
  @IsString()
  classId: string;

  @ApiProperty({ example: '2024/2025' })
  @IsNotEmpty()
  @IsString()
  academicYear: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  entryDate?: Date;
}
