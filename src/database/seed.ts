import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserSeeder } from './seeders/user.seeder';
import { AcademicYearService } from 'src/academic-year/academic-year.service';
import { TermService } from 'src/terms/terms.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userSeeder = app.get(UserSeeder);

  const ayService = app.get(AcademicYearService);
  const termService = app.get(TermService);

  await ayService.seed();
  
  await termService.seed();

  console.log('🌱 Starting database seeding...');
  await userSeeder.seedAllUsers();
  console.log('✅ Seeding completed');
;
  await app.close();
}

bootstrap();
