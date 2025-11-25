import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ClassStatus } from '../schemas/class.schema';

export class CreateClassDto {

  @ApiProperty({ description: 'Name of the class', example: 'Mathematics 101' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Grade level of the class', example: 'Grade 6' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  gradeLevel: string;

  @ApiProperty({ description: 'Maximum number of students', example: 30 })
  @IsPositive()
  capacity: number;

  @ApiProperty({
    description: 'Optional description of the class',
    example: 'Core math class covering algebra basics',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Status of the class',
    enum: ClassStatus,
    default: ClassStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(ClassStatus)
  status?: ClassStatus;

  @ApiProperty({
    description: 'Identifier of the assigned teacher',
    example: '64f0a5b3c21a7123456789ab',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  classTeacher?: string;


  @ApiProperty({
    description: 'Identifier of the assigned school',
    example: '64f0a5b3c21a7123456789ab',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  school?: string;
}

