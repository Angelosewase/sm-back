import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  Body,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { RegistrationRequestsService } from '../registration-tokens/registration-requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/schemas/user.schema';
import { QuerySchoolsDto } from './dto/query-schools.dto';
import { QueryUserDto } from '../users/dto/query-user.dto';
import { ActivateSchoolDto } from './dto/activate-school.dto';
import { QueryRegistrationRequestsDto } from '../registration-tokens/dto/query-registration-requests.dto';
import { UpdateRegistrationRequestDto } from '../registration-tokens/dto/update-registration-request.dto';
import { School } from '../school/entities/school.entity';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: Role;
  };
}

@ApiTags('Super Admin')
@Controller('api/super-admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly registrationRequestsService: RegistrationRequestsService,
  ) {}

  // ==================== School Management ====================

  @Get('schools')
  @ApiOperation({
    summary: 'View all schools in the system',
    description: 'Get a paginated list of all schools with optional filtering and search',
  })
  @ApiOkResponse({
    description: 'List of schools retrieved successfully',
  })
  async getAllSchools(@Query() query: QuerySchoolsDto) {
    return this.superAdminService.getAllSchools(query);
  }

  @Get('schools/:id')
  @ApiOperation({
    summary: 'View detailed school information',
    description: 'Get detailed information about a specific school including all associated users',
  })
  @ApiParam({ name: 'id', description: 'School identifier' })
  @ApiOkResponse({
    description: 'School details retrieved successfully',
    type: School,
  })
  async getSchoolDetails(@Param('id') id: string) {
    return this.superAdminService.getSchoolDetails(id);
  }

  @Patch('schools/:id/activate')
  @ApiOperation({
    summary: 'Activate a school',
    description: 'Activate a school in the system',
  })
  @ApiParam({ name: 'id', description: 'School identifier' })
  @ApiOkResponse({
    description: 'School activated successfully',
    type: School,
  })
  async activateSchool(@Param('id') id: string) {
    return this.superAdminService.activateSchool(id);
  }

  @Patch('schools/:id/deactivate')
  @ApiOperation({
    summary: 'Deactivate a school',
    description: 'Deactivate a school in the system',
  })
  @ApiParam({ name: 'id', description: 'School identifier' })
  @ApiOkResponse({
    description: 'School deactivated successfully',
    type: School,
  })
  async deactivateSchool(@Param('id') id: string) {
    return this.superAdminService.deactivateSchool(id);
  }

  @Patch('schools/:id/status')
  @ApiOperation({
    summary: 'Toggle school activation status',
    description: 'Activate or deactivate a school using a boolean flag',
  })
  @ApiParam({ name: 'id', description: 'School identifier' })
  @ApiOkResponse({
    description: 'School status updated successfully',
    type: School,
  })
  async toggleSchoolStatus(
    @Param('id') id: string,
    @Body() activateSchoolDto: ActivateSchoolDto,
  ) {
    if (activateSchoolDto.isActive) {
      return this.superAdminService.activateSchool(id);
    } else {
      return this.superAdminService.deactivateSchool(id);
    }
  }

  // ==================== User Management ====================

  @Get('users')
  @ApiOperation({
    summary: 'View all system users',
    description:
      'Get a paginated list of all users in the system with optional filters, search, and role filtering',
  })
  @ApiOkResponse({
    description: 'List of users retrieved successfully',
  })
  async getAllUsers(@Query() query: QueryUserDto) {
    return this.superAdminService.getAllUsers(query);
  }

  // ==================== Registration Requests Management ====================

  @Get('registration-requests')
  @ApiOperation({
    summary: 'View all registration requests',
    description:
      'Get a paginated list of all registration requests with optional status filtering',
  })
  @ApiOkResponse({
    description: 'List of registration requests retrieved successfully',
  })
  async getAllRegistrationRequests(@Query() query: QueryRegistrationRequestsDto) {
    return this.registrationRequestsService.findAll(query);
  }

  @Get('registration-requests/stats')
  @ApiOperation({
    summary: 'Get registration request statistics',
    description: 'Get statistics about registration requests (total, pending, approved, rejected)',
  })
  @ApiOkResponse({
    description: 'Statistics retrieved successfully',
  })
  async getRegistrationRequestStats() {
    return this.registrationRequestsService.getStats();
  }

  @Get('registration-requests/:id')
  @ApiOperation({
    summary: 'View a specific registration request',
    description: 'Get detailed information about a specific registration request',
  })
  @ApiParam({ name: 'id', description: 'Registration request identifier' })
  @ApiOkResponse({
    description: 'Registration request retrieved successfully',
  })
  async getRegistrationRequest(@Param('id') id: string) {
    return this.registrationRequestsService.findOne(id);
  }

  @Patch('registration-requests/:id/status')
  @ApiOperation({
    summary: 'Approve or reject a registration request',
    description: 'Update the status of a registration request (approve or reject)',
  })
  @ApiParam({ name: 'id', description: 'Registration request identifier' })
  @ApiOkResponse({
    description: 'Registration request status updated successfully',
  })
  async updateRegistrationRequestStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateRegistrationRequestDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.registrationRequestsService.updateStatus(
      id,
      updateDto,
      req.user.userId,
    );
  }
}

