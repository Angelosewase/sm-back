import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { HeadTeachersController } from './head-teachers.controller';
import { HeadTeachersService } from './head-teachers.service';
import { Mongoose } from 'mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { HeadTeacher, HeadTeacherSchema } from './schemas/head-teacher-schema';

@Module({
  imports: [UsersModule, AuthModule,
    MongooseModule.forFeature([{ name:HeadTeacher.name, schema: HeadTeacherSchema }])
  ],
  controllers: [HeadTeachersController],
  providers: [HeadTeachersService],
})
export class HeadTeachersModule {}


