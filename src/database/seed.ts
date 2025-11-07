import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserSeeder } from './seeders/user.seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userSeeder = app.get(UserSeeder);

  console.log('🌱 Starting database seeding...');
  await userSeeder.seedAllUsers();
  console.log('✅ Seeding completed');
;
  await app.close();
}

bootstrap();
