import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsMongoId } from 'class-validator';

export class AssignSubjectsDto {
  @ApiProperty({
    description: 'Array of subject ids to assign to teacher',
    example: ['68f79d534286e66c8b4ad219'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  subjectIds: string[];
}
