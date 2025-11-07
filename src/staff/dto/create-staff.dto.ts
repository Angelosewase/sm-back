import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({
    description: 'Unique email address for the staff member',
    example: 'staff@example.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Full name of the staff member' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Phone number of the staff member' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Identifier of the associated school' })
  @IsOptional()
  @IsString()
  school?: string;
}


