import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeederService } from './seeders/user.seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userSeeder = app.get(SeederService);
  await userSeeder.seedAllUsers();

  await app.close();
}

bootstrap();
