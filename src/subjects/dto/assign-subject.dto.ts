import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignSubjectDto {
  @ApiProperty({ example: '2024/2025' })
  @IsNotEmpty()
  @IsString()
  academicYear: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  term?: string;
}

export class AssignSubjectToTeacherDto extends AssignSubjectDto {
  @ApiProperty({ description: 'Optional teacher _id', required: false })
  @IsString()
  teacherId: string;
}

export class AssignSubjecctToClassDto extends AssignSubjectDto {
  @ApiProperty({ description: 'Class _id' })
  @IsString()
  classId: string;
}


export class AssignSubjectToClassWithTeacherDto extends AssignSubjectToTeacherDto {
  @ApiProperty({ description: 'Class _id' })
  @IsString()
  classId: string;
}