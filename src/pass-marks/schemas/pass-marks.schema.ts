import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type PassMarksDocument = PassMarks & Document;

@Schema({ timestamps: true })
export class PassMarks {
  @ApiProperty({ description: 'Reference to School _id', required: true })
  @Prop({ type: Types.ObjectId, ref: 'School', required: true, unique: true, index: true })
  school: Types.ObjectId;

  @ApiProperty({ description: 'Pass mark threshold', example: 50, required: true })
  @Prop({ type: Number, required: true, min: 0, max: 100 })
  passMark: number;

  @ApiProperty({ description: 'Minimum score for second sitting', example: 40, required: true })
  @Prop({ type: Number, required: true, min: 0, max: 100 })
  secondSittingMin: number;

  @ApiProperty({ description: 'Maximum score for second sitting', example: 49, required: true })
  @Prop({ type: Number, required: true, min: 0, max: 100 })
  secondSittingMax: number;

  @ApiProperty({ description: 'Fail mark threshold', example: 39, required: true })
  @Prop({ type: Number, required: true, min: 0, max: 100 })
  failMark: number;

  @ApiProperty({ description: 'User who created/updated this record', required: false })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const PassMarksSchema = SchemaFactory.createForClass(PassMarks);

// Ensure one pass marks configuration per school
PassMarksSchema.index({ school: 1 }, { unique: true });

