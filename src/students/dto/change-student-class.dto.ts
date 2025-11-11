import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, ValidateIf } from 'class-validator';

export class ChangeStudentClassDto {
  @ApiPropertyOptional({
    description:
      'New class ObjectId to assign. Use null to unassign. Omit to leave unchanged.',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsMongoId()
  classId?: string | null;
}

