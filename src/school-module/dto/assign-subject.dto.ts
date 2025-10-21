import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignSubjectDto {
  @ApiProperty({ description: 'Subject _id' })
  @IsNotEmpty()
  @IsString()
  subjectId: string;

  @ApiProperty({ description: 'Optional teacher _id', required: false })
  @IsOptional()
  @IsString()
  teacherId?: string;

  @ApiProperty({ example: '2024/2025' })
  @IsNotEmpty()
  @IsString()
  academicYear: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  term?: string;
}
