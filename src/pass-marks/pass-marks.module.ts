import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassMarksController } from './pass-marks.controller';
import { PassMarksService } from './pass-marks.service';
import { PassMarks, PassMarksSchema } from './schemas/pass-marks.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PassMarks.name, schema: PassMarksSchema },
    ]),
  ],
  controllers: [PassMarksController],
  providers: [PassMarksService],
  exports: [PassMarksService],
})
export class PassMarksModule {}

