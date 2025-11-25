import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSchoolDto {
  @ApiProperty({
    description: 'Unique name of the school',
    example: 'Springfield Elementary School',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    description: 'Type or category of the school',
    example: 'Secondary',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  schoolType?: string;

  @ApiPropertyOptional({
    description: 'Year the school was established',
    example: 1995,
  })
  @IsOptional()
  @IsInt()
  @Min(1800)
  establishedYear?: number;

  @ApiProperty({
    description: 'Maximum number of students the school can accommodate',
    example: 450,
  })
  @IsInt()
  @Min(0)
  studentCapacity: number;

  @ApiPropertyOptional({
    description: 'Brief description of the school',
    example: 'A community-driven school with focus on STEM education.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Street address of the school',
    example: '742 Evergreen Terrace',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiProperty({
    description: 'City where the school is located',
    example: 'Springfield',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiProperty({
    description: 'District where the school is located',
    example: 'Shelbyville District',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  district: string;

  @ApiProperty({
    description: 'Primary phone number of the school',
    example: '+1-202-555-0147',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  phoneNumber: string;

  @ApiProperty({
    description: 'Primary contact email of the school',
    example: 'contact@springfield.edu',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Official website of the school',
    example: 'https://www.springfield.edu',
  })
  @IsUrl()
  @IsNotEmpty()
  website: string;
}
