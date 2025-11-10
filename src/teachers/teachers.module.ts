import { Module } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Teacher, TeacherSchema } from './schemas/teacher.schema';

@Module({
  imports: [UsersModule, AuthModule,
    MongooseModule.forFeature([
      {name: Teacher.name, schema: TeacherSchema}
    ])
  ],
  controllers: [TeachersController],
  providers: [TeachersService],
})
export class TeachersModule {}


