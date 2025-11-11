import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsString,
} from 'class-validator';

export class BulkStudentActionDto {
  @ApiProperty({
    description: 'List of student ObjectIds to apply the bulk action to',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  @IsString({ each: true })
  ids!: string[];
}

