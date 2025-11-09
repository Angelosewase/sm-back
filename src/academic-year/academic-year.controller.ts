// src/academic-year/academic-year.controller.ts
import { Controller, Get } from '@nestjs/common';
import { AcademicYearService } from './academic-year.service';
import { ApiTags } from '@nestjs/swagger';


@ApiTags('Academic Years')
@Controller('academic-years')
export class AcademicYearController {
  constructor(private readonly service: AcademicYearService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('active')
  getActive() {
    return this.service.getActive();
  }
}