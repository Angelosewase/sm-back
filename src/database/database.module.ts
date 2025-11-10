import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeederService } from './seeders/user.seeder';
import { User, UserSchema } from '../users/schemas/user.schema';
import { School, SchoolSchema } from 'src/school-module/schemas/school.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }, {name: School.name, schema: SchoolSchema}]),
  ],
  providers: [SeederService],
  exports: [SeederService],
})
export class DatabaseModule {}
