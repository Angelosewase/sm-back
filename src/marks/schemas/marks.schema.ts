import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MarksDocument = Marks & Document;

@Schema({ timestamps: true })
export class Marks {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, index: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subject', required: true, index: true })
  subject: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  academicYear: string; // e.g. "2023/2024"

  @Prop({ required: true, trim: true, index: true })
  term: string; // e.g. "Term 1"

  @Prop({ type: Types.ObjectId, ref: 'Assessment', required: true, index: true })
  assessment: Types.ObjectId;

  @Prop({ type: Number, required: true })
  score: number;

  @Prop({ type: Number, default: 1 })
  weight?: number;

  @Prop({ trim: true })
  comment?: string;

  @Prop({ type: Types.ObjectId, ref: 'Teacher' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Teacher' })
  updatedBy?: Types.ObjectId;
}

export const MarksSchema = SchemaFactory.createForClass(Marks);

// 🔒 Enforce one unique mark per student–subject–assessment–term–year
MarksSchema.index(
  { student: 1, subject: 1, academicYear: 1, term: 1, assessment: 1 },
  { unique: true },
);

// ⚡ Query optimization index (non-unique)
MarksSchema.index({ academicYear: 1, term: 1, subject: 1 });

