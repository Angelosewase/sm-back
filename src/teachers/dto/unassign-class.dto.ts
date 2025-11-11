// unassign-classes.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsMongoId } from 'class-validator';

export class UnassignClassesDto {
  @ApiProperty({
    description: 'Array of class ids to unassign from the teacher',
    example: ['68f79d534286e66c8b4ad219', '68f79d534286e66c8b4ad21a'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  classIds: string[];
}