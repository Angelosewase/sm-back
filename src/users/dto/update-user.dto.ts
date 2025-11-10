import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsMongoId, IsOptional, IsPhoneNumber, IsString, MaxLength } from 'class-validator';
import { Role } from '../schemas/user.schema';
import { ObjectId, Types } from 'mongoose';

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

  @ApiPropertyOptional({ required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ required: false })
  @IsOptional()
  @IsString()
  experience?: string;

  @ApiPropertyOptional({ description: 'School id to assign' })
  @IsOptional()
  @IsMongoId()
  school?: Types.ObjectId;
}
