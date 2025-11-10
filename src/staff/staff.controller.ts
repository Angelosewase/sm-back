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
  ApiQuery,
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
  @ApiCreatedResponse({
    description:
      'Staff member registered successfully. Response includes a temporaryPassword field that is also emailed.',
  })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(@Body() createStaffDto: CreateStaffDto) {
    return this.staffService.create(createStaffDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List staff members with optional filtering, search, and pagination',
  })
  @ApiQuery({ name: 'q', required: false, description: 'Search across name and email' })
  @ApiQuery({ name: 'email', required: false, description: 'Filter by exact email address' })
  @ApiQuery({ name: 'school', required: false, description: 'Filter by school ObjectId' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (1-100)', example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Field to sort by', example: 'createdAt' })
  @ApiQuery({ name: 'order', required: false, description: 'Sort direction', example: 'desc' })
  @ApiOkResponse({ description: 'Staff members retrieved successfully with pagination metadata' })
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


