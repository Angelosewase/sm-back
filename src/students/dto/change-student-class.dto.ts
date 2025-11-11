import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class ChangeStudentClassDto {
  @ApiProperty({
    description: 'New class ObjectId to assign',
    type: String,
  })
  @IsNotEmpty()
  @IsMongoId()
  classId: string;
}

