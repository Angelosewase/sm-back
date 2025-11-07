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
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@ApiTags('staff')
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new staff member' })
  @ApiCreatedResponse({ description: 'Staff member registered successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(@Body() createStaffDto: CreateStaffDto) {
    return this.staffService.create(createStaffDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List staff members with optional filtering, search, and pagination',
  })
  @ApiOkResponse({ description: 'Staff members retrieved successfully' })
  async findAll(@Query() query: QueryStaffDto) {
    return this.staffService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get staff member by id' })
  @ApiOkResponse({ description: 'Staff member retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Staff member not found' })
  async findOne(@Param('id') id: string) {
    return this.staffService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a staff profile' })
  @ApiOkResponse({ description: 'Staff member updated successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiNotFoundResponse({ description: 'Staff member not found' })
  async update(
    @Param('id') id: string,
    @Body() updateStaffDto: UpdateStaffDto,
  ) {
    return this.staffService.update(id, updateStaffDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a staff member' })
  @ApiOkResponse({ description: 'Staff member removed successfully' })
  @ApiNotFoundResponse({ description: 'Staff member not found' })
  async remove(@Param('id') id: string) {
    return this.staffService.remove(id);
  }
}


