import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubjectAssignmentDocument = SubjectAssignment & Document;

@Schema({ timestamps: true })
export class SubjectAssignment {
  @Prop({ type: Types.ObjectId, ref: 'Class', required: true, index: true })
  class: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subject', required: true, index: true })
  subject: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  teacher?: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  academicYear: string;

  @Prop({ trim: true })
  term?: string;

  @Prop()
  hoursPerWeek?: number;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  coTeacher?: Types.ObjectId[];
}

export const SubjectAssignmentSchema =
  SchemaFactory.createForClass(SubjectAssignment);
SubjectAssignmentSchema.index(
  { class: 1, subject: 1, academicYear: 1 },
  { unique: true },
);
