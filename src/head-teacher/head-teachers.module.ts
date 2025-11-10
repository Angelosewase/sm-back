import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { HeadTeachersController } from './head-teachers.controller';
import { HeadTeachersService } from './head-teachers.service';

@Module({
  imports: [UsersModule, AuthModule],
  controllers: [HeadTeachersController],
  providers: [HeadTeachersService],
})
export class HeadTeachersModule {}


