import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { RegistrationRequestStatus } from '../schemas/registration-request.schema';

export class UpdateRegistrationRequestDto {
  @ApiProperty({
    enum: RegistrationRequestStatus,
    example: RegistrationRequestStatus.APPROVED,
    description: 'New status for the registration request',
  })
  @IsEnum(RegistrationRequestStatus)
  @IsNotEmpty()
  status: RegistrationRequestStatus;
}

