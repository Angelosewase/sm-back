import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Role } from '../../users/schemas/user.schema';
import { Type } from 'class-transformer';

export class GenerateTokenDto {
  @ApiProperty({
    enum: [Role.SCHOOL_OWNER, Role.TEACHER, Role.HEADTeacher],
    description: 'Role for which to generate the token',
    example: Role.TEACHER,
  })
  @IsEnum([Role.SCHOOL_OWNER, Role.TEACHER, Role.HEADTeacher])
  role: Role;

  @ApiProperty({
    description: 'Token expiration in days (default: 30)',
    example: 30,
    required: false,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number = 30;
}

