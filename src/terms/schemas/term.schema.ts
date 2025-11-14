import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TermDocument = Term & Document;

@Schema({ timestamps: true })
export class Term {
  @Prop({ type: Types.ObjectId, ref: 'AcademicYear', required: true, index: true })
  academicYear: Types.ObjectId;

  @Prop({ type: Number, required: true, enum: [1, 2, 3] })
  order: number; // 1, 2, or 3

  @Prop({ default: false })
  isOpen: boolean;

  @Prop({ default: false })
  isClosed: boolean; // Once closed, cannot be reopened

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;
}

export const TermSchema = SchemaFactory.createForClass(Term);

// Create compound index to ensure unique term order per academic year
TermSchema.index({ academicYear: 1, order: 1 }, { unique: true });
