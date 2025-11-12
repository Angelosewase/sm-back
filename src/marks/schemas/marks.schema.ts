import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MarksDocument = Marks & Document;

export enum MarkStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  LOCKED = 'locked',
}

@Schema({ timestamps: true })
export class Marks {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, index: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subject', required: true, index: true })
  subject: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  academicYear: string;

  @Prop({ required: true, trim: true, index: true })
  term: string;

  @Prop({ type: Types.ObjectId, ref: 'Assessment', required: true, trim: true })
  assessment: string;

  @Prop({ type: Number, required: true })
  score: number;

  @Prop({ type: Number, default: 1 })
  weight?: number;

  @Prop({ trim: true })
  comment?: string;

  @Prop({
    type: String,
    enum: Object.values(MarkStatus),
    default: MarkStatus.DRAFT,
    index: true,
  })
  status: MarkStatus;


  @Prop({ type: Types.ObjectId, ref: 'Teacher' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Teacher' })
  updatedBy?: Types.ObjectId;
}

export const MarksSchema = SchemaFactory.createForClass(Marks);
MarksSchema.index(
  { student: 1, subject: 1, academicYear: 1, term: 1, assessmentType: 1 },
  { unique: false },
);
MarksSchema.index({ academicYear: 1, term: 1, class: 1, subject: 1 });
