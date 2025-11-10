import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsMongoId } from 'class-validator';

export class AssignSubjectsDto {
  @ApiProperty({ description: 'Subject IDs to assign to the teacher', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  subjectIds: string[];
}

