import { IsNotEmpty, IsString, IsNumber, IsOptional, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AssessmentType {
  EXAM = 'exam',
  PRACTICAL_CAT = 'practical cat',
  PRACTICAL_EXAM = 'practical exam',
  CAT = 'cat',
}
export class EnterMarkDto {
  @ApiProperty({ description: 'Student _id (ObjectId)' })
  @IsNotEmpty()
  @IsString()
  studentId: string;

  @ApiProperty({ description: 'Subject _id (ObjectId)' })
  @IsNotEmpty()
  @IsString()
  subjectId: string;

  @ApiProperty({ description: 'Class _id (ObjectId)' })
  @IsNotEmpty()
  @IsString()
  classId: string;

  @ApiProperty({ description: 'Academic year label, e.g. 2024/2025' })
  @IsNotEmpty()
  @IsString()
  academicYear: string;

  @ApiProperty({ description: 'Term name, e.g. Term 1' })
  @IsNotEmpty()
  @IsString()
  term: string;

  @ApiProperty({
    description: 'Assessment type, e.g. exam, practical',
    required: false,
  })
  @IsOptional()
  @IsString()
  assessmentType?: string;

  @ApiProperty({ description: 'Score value (0..subject.maxScore)' })
  @IsNotEmpty()
  @IsNumber()
  score: number;

  @ApiProperty({ description: 'Optional teacher comment', required: false })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ description: 'Assessment _id (ObjectId)' })
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  assessmentId: string;
}
