import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsMongoId } from 'class-validator';

export class AssignClassesDto {
  @ApiProperty({
    description: 'Array of class ids to assign',
    example: ['68f79d534286e66c8b4ad219'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  classIds: string[];
}
