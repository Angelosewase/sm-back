import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({
    description: 'New password for the user (minimum 6 characters)',
    example: 'NewSecurePass123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

