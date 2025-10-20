import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestResetDto {
  @ApiProperty({
    description: 'Email address to send password reset OTP',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;
}
