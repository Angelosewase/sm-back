import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsMongoId } from 'class-validator';

export class AssignClassesDto {
  @ApiProperty({ description: 'Class IDs to assign to the teacher', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  classIds: string[];
}

