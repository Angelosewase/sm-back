import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ActivateSchoolDto {
  @ApiProperty({ description: 'Activate (true) or deactivate (false) the school', example: true })
  @IsBoolean()
  isActive: boolean;
}

