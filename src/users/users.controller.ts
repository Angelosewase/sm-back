import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './schemas/user.schema';

@ApiTags('Users')
@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new user',
    description:
      'Creates a new user with the provided email, password, name, and role.',
  })
  @ApiCreatedResponse({ description: 'User created successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async createUser(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createUser(
     { email: createUserDto.email,
      password: createUserDto.password,
      role: createUserDto.role,
      name: createUserDto.name,}
    );
    return this.sanitizeUser(user);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve a single user by providing their unique identifier.',
  })
  @ApiParam({
    name: 'id',
    description: 'MongoDB ObjectId of the user',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({ description: 'User retrieved successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.sanitizeUser(user);
  }

  @Get('email/:email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get user by email',
    description: 'Retrieve a single user by providing their email address.',
  })
  @ApiParam({
    name: 'email',
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  @ApiOkResponse({ description: 'User retrieved successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async getUserByEmail(@Param('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.sanitizeUser(user);
  }

  private sanitizeUser(user: User) {
    const rawUser =
      typeof (user as any).toObject === 'function'
        ? (user as any).toObject()
        : (user as any);
    const { password, ...rest } = rawUser;
    return rest;
  }
}
