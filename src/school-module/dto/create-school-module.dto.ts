import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSchoolModuleDto {
  @ApiProperty({ example: 'Green Valley High School' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ required: false, example: 'Addis Ababa' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @ApiProperty({ required: false, example: 'Bole, Street 123' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiProperty({ required: false, example: '+251 911 000 000' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;

  @ApiProperty({ example: 'info@greenvalley.edu' })
  @IsEmail()
  @MaxLength(140)
  contactEmail: string;
}
