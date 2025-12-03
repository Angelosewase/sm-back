import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { EmailService } from './email.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { RegistrationTokensModule } from '../registration-tokens/registration-tokens.module';
import { SchoolModule } from '../school/school.module';
import { Teacher, TeacherSchema } from '../teachers/schemas/teacher.schema';
import { HeadTeacher, HeadTeacherSchema } from '../head-teacher/schemas/head-teacher-schema';

@Module({
  imports: [
    UsersModule,
    RegistrationTokensModule,
    SchoolModule,
    PassportModule,
    MongooseModule.forFeature([
      { name: Teacher.name, schema: TeacherSchema },
      { name: HeadTeacher.name, schema: HeadTeacherSchema },
    ]),
    CacheModule.register({
      ttl: 900000, // 15 minutes default
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailService, JwtStrategy],
  exports: [AuthService, EmailService],
})
export class AuthModule {}
