import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRegistrationRequestDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the requester',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the requester',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'I would like to register as a school owner and manage my school through this platform.',
    description: 'Additional notes or information about the registration request',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  additionalNotes?: string;
}

