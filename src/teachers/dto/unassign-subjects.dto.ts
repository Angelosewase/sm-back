import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsMongoId } from 'class-validator';

export class UnassignSubjectsDto {
  @ApiProperty({
    description: 'Subject IDs to remove from the teacher',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  subjectIds: string[];
}


