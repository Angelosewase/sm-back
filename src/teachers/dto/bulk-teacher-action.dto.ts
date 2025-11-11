import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsMongoId } from 'class-validator';

export class BulkTeacherActionDto {
  @ApiProperty({
    type: [String],
    description: 'Array of teacher identifiers',
    example: ['64f0a5b3c21a7123456789ab', '64f0a5b3c21a7123456789ac'],
  })
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  ids: string[];
}


