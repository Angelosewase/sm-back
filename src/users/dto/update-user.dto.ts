import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsMongoId, IsOptional, IsPhoneNumber, IsString, MaxLength } from 'class-validator';
import { Role } from '../schemas/user.schema';

export class UpdateUserDto {
  

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'School id to assign' })
  @IsOptional()
  @IsMongoId()
  school?: string;
}
