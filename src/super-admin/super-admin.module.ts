import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { SchoolModule } from '../school/school.module';
import { UsersModule } from '../users/users.module';
import { RegistrationTokensModule } from '../registration-tokens/registration-tokens.module';
import { School, SchoolSchema } from '../school/entities/school.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: School.name, schema: SchoolSchema }]),
    SchoolModule,
    UsersModule,
    RegistrationTokensModule,
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}

