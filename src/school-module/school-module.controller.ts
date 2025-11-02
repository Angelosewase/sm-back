import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { SchoolModuleService } from './school-module.service';
import { CreateSchoolModuleDto } from './dto/create-school-module.dto';
import { UpdateSchoolModuleDto } from './dto/update-school-module.dto';
import { QuerySchoolDto } from './dto/query-school.dto';
import { ApiTags, ApiOkResponse, ApiCreatedResponse, ApiQuery } from '@nestjs/swagger';
import { QueryUserDto } from 'src/users/dto/query-user.dto';

@ApiTags('schools')
@Controller('schools')
export class SchoolModuleController {
  constructor(private readonly schoolModuleService: SchoolModuleService) {}

  @Post()
  @ApiCreatedResponse({ description: 'School created' })
  create(@Body() createSchoolModuleDto: CreateSchoolModuleDto) {
    return this.schoolModuleService.create(createSchoolModuleDto);
  }

  @Get()
  @ApiOkResponse({ description: 'Paginated list of schools' })
  @ApiQuery({ type: QuerySchoolDto })
  findAll(@Query() query: QuerySchoolDto) {
    return this.schoolModuleService.findAll(query);
  }


  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schoolModuleService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSchoolModuleDto: UpdateSchoolModuleDto) {
    return this.schoolModuleService.update(id, updateSchoolModuleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.schoolModuleService.remove(id);
  }
}
