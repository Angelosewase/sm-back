import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum AssessmentType {
  EXAM = 'exam',
  PRACTICAL_CAT = 'practical cat',
  PRACTICAL_EXAM = 'practical exam',
  CAT = 'cat',
}

class SingleMark {
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

  @ApiProperty({ description: 'Assessment type, e.g. exam, practical cat, etc.' })
  @IsNotEmpty()
  @IsEnum(AssessmentType)
  assessmentType: AssessmentType;

  @ApiProperty({ description: 'Score value (0..subject.maxScore)' })
  @IsNotEmpty()
  @IsNumber()
  score: number;

  @ApiProperty({ description: 'Optional teacher comment', required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class BulkMarksDto {
  @ApiProperty({ type: [SingleMark] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleMark)
  marks: SingleMark[];
}

export class BulkSubmitMarksDto {
  @ApiProperty({ type: [SingleMark] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleMark)
  marks: SingleMark[];
}

export class BulkApproveMarksDto {
  @ApiProperty({ type: [SingleMark] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleMark)
  marks: SingleMark[];
}