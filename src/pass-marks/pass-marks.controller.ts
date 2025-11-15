import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from 'src/users/schemas/user.schema';
import { PassMarksService } from './pass-marks.service';
import { CreatePassMarksDto } from './dto/create-pass-marks.dto';
import { UpdatePassMarksDto } from './dto/update-pass-marks.dto';
import { PassMarks } from './schemas/pass-marks.schema';

@ApiBearerAuth('access-token')
@ApiTags('Pass Marks')
@Controller('api/pass-marks')
export class PassMarksController {
  constructor(private readonly passMarksService: PassMarksService) {}

  @ApiOperation({ summary: 'Create pass marks configuration for a school (Admin/Head Teacher only)' })
  @ApiResponse({ status: 201, description: 'Pass marks configuration created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or validation failed' })
  @ApiResponse({ status: 409, description: 'Pass marks configuration already exists for this school' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HEADTeacher)
  @Post()
  async create(@Req() req: any, @Body() createPassMarksDto: CreatePassMarksDto): Promise<PassMarks> {
    return this.passMarksService.create(createPassMarksDto, req.user?.id);
  }

  @ApiOperation({ summary: 'Update pass marks configuration for a school (Admin/Head Teacher only)' })
  @ApiResponse({ status: 200, description: 'Pass marks configuration updated successfully' })
  @ApiResponse({ status: 404, description: 'Pass marks configuration not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HEADTeacher)
  @Put(':schoolId')
  async update(
    @Req() req: any,
    @Param('schoolId') schoolId: string,
    @Body() updatePassMarksDto: UpdatePassMarksDto,
  ): Promise<PassMarks> {
    return this.passMarksService.update(schoolId, updatePassMarksDto, req.user?.id);
  }

  @ApiOperation({ summary: 'Get pass marks configuration for a specific school' })
  @ApiResponse({ status: 200, description: 'Pass marks configuration retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Pass marks configuration not found' })
  @UseGuards(JwtAuthGuard)
  @Get('school/:schoolId')
  async getBySchool(@Param('schoolId') schoolId: string): Promise<PassMarks | null> {
    return this.passMarksService.findBySchool(schoolId);
  }

  @ApiOperation({ summary: 'Get all pass marks configurations (Admin/Head Teacher only)' })
  @ApiResponse({ status: 200, description: 'List of all pass marks configurations' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HEADTeacher)
  @Get()
  async findAll(): Promise<PassMarks[]> {
    return this.passMarksService.findAll();
  }

  @ApiOperation({ summary: 'Delete pass marks configuration for a school (Admin/Head Teacher only)' })
  @ApiResponse({ status: 200, description: 'Pass marks configuration deleted successfully' })
  @ApiResponse({ status: 404, description: 'Pass marks configuration not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HEADTeacher)
  @Delete(':schoolId')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('schoolId') schoolId: string): Promise<{ message: string }> {
    await this.passMarksService.delete(schoolId);
    return { message: 'Pass marks configuration deleted successfully' };
  }
}

