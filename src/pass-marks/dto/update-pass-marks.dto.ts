import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePassMarksDto {
  @ApiProperty({ description: 'Pass mark threshold (0-100)', example: 50, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passMark?: number;

  @ApiProperty({ description: 'Minimum score for second sitting (0-100)', example: 40, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  secondSittingMin?: number;

  @ApiProperty({ description: 'Maximum score for second sitting (0-100)', example: 49, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  secondSittingMax?: number;

  @ApiProperty({ description: 'Fail mark threshold (0-100)', example: 39, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  failMark?: number;
}

