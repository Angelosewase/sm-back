import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ValidateTokenDto {
  @ApiProperty({
    example: 'abc123def456',
    description: 'Registration token to validate',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

