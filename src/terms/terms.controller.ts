// src/term/term.controller.ts
import { Controller, Get } from '@nestjs/common';
import { TermService } from './terms.service';

@Controller('terms')
export class TermController {
  constructor(private readonly service: TermService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}