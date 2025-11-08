import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { SchoolModule } from './school-module/school-module.module';
import { AcademicYearModule } from './academic-year/academic-year.module';
import { TermModule } from './terms/terms.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI as string),
    AuthModule,
    UsersModule,
    DatabaseModule,
    SchoolModule,
    AcademicYearModule,
    TermModule,

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
