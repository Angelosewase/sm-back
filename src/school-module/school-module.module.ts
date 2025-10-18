import { Module } from '@nestjs/common';
import { SchoolModuleService } from './school-module.service';
import { SchoolModuleController } from './school-module.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { School, SchoolSchema } from './schemas/school.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: School.name, schema: SchoolSchema }]),
  ],
  controllers: [SchoolModuleController],
  providers: [SchoolModuleService],
})
export class SchoolModuleModule {}
