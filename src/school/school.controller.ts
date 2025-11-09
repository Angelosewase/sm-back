import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SchoolService } from './school.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { School as SchoolEntity } from './entities/school.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/schemas/user.schema';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: Role;
  };
}

@ApiTags('schools')
@Controller('school')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  @ApiOperation({ summary: 'Create a new school' })
  @ApiCreatedResponse({
    description: 'School created successfully',
    type: SchoolEntity,
  })
  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createSchoolDto: CreateSchoolDto,
  ): Promise<SchoolEntity> {
    return this.schoolService.create(createSchoolDto, req.user.userId);
  }

  @ApiOperation({ summary: 'Retrieve all schools' })
  @ApiOkResponse({
    description: 'List of schools retrieved successfully',
    type: [SchoolEntity],
  })
  @Get()
  findAll(): Promise<SchoolEntity[]> {
    return this.schoolService.findAll();
  }

  @ApiOperation({ summary: 'Retrieve a single school by id' })
  @ApiParam({ name: 'id', description: 'School identifier' })
  @ApiOkResponse({
    description: 'School retrieved successfully',
    type: SchoolEntity,
  })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<SchoolEntity> {
    return this.schoolService.findOne(id);
  }

  @ApiOperation({ summary: 'Update an existing school' })
  @ApiParam({ name: 'id', description: 'School identifier' })
  @ApiOkResponse({
    description: 'School updated successfully',
    type: SchoolEntity,
  })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSchoolDto: UpdateSchoolDto,
  ): Promise<SchoolEntity> {
    return this.schoolService.update(id, updateSchoolDto);
  }

  @ApiOperation({ summary: 'Remove a school' })
  @ApiParam({ name: 'id', description: 'School identifier' })
  @ApiOkResponse({ description: 'School removed successfully' })
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.schoolService.remove(id);
  }
}
