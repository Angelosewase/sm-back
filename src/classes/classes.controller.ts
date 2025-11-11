import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { QueryClassesDto } from './dto/query-classes.dto';
import { BulkClassActionDto } from './dto/bulk-class-action.dto';

@ApiTags('classes')
@Controller('api/classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }

  @Get()
  findAll(@Query() query: QueryClassesDto) {
    return this.classesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.classesService.restore(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto) {
    return this.classesService.update(id, updateClassDto);
  }

  @Delete(':id/permanent')
  removePermanently(@Param('id') id: string) {
    return this.classesService.removePermanently(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }

  @Post('bulk/trash')
  bulkTrash(@Body() bulkClassActionDto: BulkClassActionDto) {
    return this.classesService.bulkTrash(bulkClassActionDto.ids);
  }

  @Post('bulk/restore')
  bulkRestore(@Body() bulkClassActionDto: BulkClassActionDto) {
    return this.classesService.bulkRestore(bulkClassActionDto.ids);
  }

  @Post('bulk/permanent')
  bulkRemovePermanently(@Body() bulkClassActionDto: BulkClassActionDto) {
    return this.classesService.bulkRemovePermanently(bulkClassActionDto.ids);
  }
}

