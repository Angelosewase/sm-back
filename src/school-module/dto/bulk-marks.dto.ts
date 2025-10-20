import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SingleMark {
  @ApiProperty()
  studentId: string;

  @ApiProperty()
  subjectId: string;

  @ApiProperty()
  classId: string;

  @ApiProperty()
  academicYear: string;

  @ApiProperty()
  term: string;

  @ApiProperty()
  assessmentType: string;

  @ApiProperty()
  score: number;

  @ApiProperty({ required: false })
  comment?: string;
}

export class BulkMarksDto {
  @ApiProperty({ type: [SingleMark] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleMark)
  marks: SingleMark[];
}
