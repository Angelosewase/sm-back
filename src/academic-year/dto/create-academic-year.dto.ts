import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateAcademicYearDto {
  @ApiProperty({
    description: 'Academic year label',
    example: '2024/2025',
  })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional({
    description: 'Start date of the academic year',
    example: '2024-09-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date of the academic year',
    example: '2025-06-30',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

