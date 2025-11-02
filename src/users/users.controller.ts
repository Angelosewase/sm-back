import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Body,
  Query,
  Post,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
// use runtime require for multer to avoid missing type declaration issues in some environments
const multer = require('multer');
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from './schemas/user.schema';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RegisterDto } from './dto/register-user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @ApiOkResponse({ description: 'Created user' })
  async create(@Body() dto: RegisterDto) {
    return await this.usersService.createUser(dto);
  }

  // @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOkResponse({ description: 'Paginated list of users' })
  async findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOkResponse({ description: 'User by id' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOkResponse({ description: 'Updated user' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto as any);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOkResponse({ description: 'Deleted user' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post(':id/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.diskStorage({
        destination: (req: any, file: any, cb: any) => {
          const userId = req.params.id;
          const dest = join(process.cwd(), 'uploads', 'avatars', userId);
          if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
          cb(null, dest);
        },
        filename: (req: any, file: any, cb: any) => {
          const orig = file.originalname || 'file';
          const ext = orig.includes('.') ? orig.split('.').pop() : '';
          const name = `avatar_${Date.now()}${ext ? '.' + ext : ''}`;
          cb(null, name);
        },
      }),
      fileFilter: (req: any, file: any, cb: any) => {
        // allow images only
        if (!file.mimetype || !file.mimetype.startsWith('image/'))
          return cb(new Error('Only image files are allowed'), false);
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadAvatar(@Param('id') id: string, @UploadedFile() file: any) {
    if (!file) throw new Error('File not provided or invalid');
    const rel = join('uploads', 'avatars', id, file.filename);
    return this.usersService.saveAvatar(id, rel);
  }

  @Get(':id/avatar')
  async serveAvatar(@Param('id') id: string, @Res() res: any) {
    const user = await this.usersService.findById(id);
    if (!user || !user.avatar) return res.status(404).send('No avatar');
    const p = join(process.cwd(), user.avatar);
    return res.sendFile(p);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Delete(':id/avatar')
  async deleteAvatar(@Param('id') id: string) {
    const updated = await this.usersService.removeAvatar(id);
    if (!updated) return { deleted: false };
    return { deleted: true, user: updated };
  }
}
