import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AcademicYearDocument = AcademicYear & Document;

@Schema({ timestamps: true })
export class AcademicYear {
  @Prop({ required: true, trim: true, index: true })
  label: string; // e.g. 2024/2025

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;

  @Prop({ default: false })
  isActive?: boolean;
}

export const AcademicYearSchema = SchemaFactory.createForClass(AcademicYear);
