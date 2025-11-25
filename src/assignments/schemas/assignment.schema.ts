import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubjectAssignmentDocument = SubjectAssignment & Document;

@Schema({ timestamps: true })
export class SubjectAssignment {
  @Prop({ type: Types.ObjectId, ref: 'Class', index: true })
  class?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subject', required: true, index: true })
  subject: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  teacher?: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  academicYear: string;

  @Prop({ trim: true })
  term?: string;

  @Prop({ type: Number, min: 0 })
  hoursPerWeek?: number;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  coTeacher?: Types.ObjectId[];

  @Prop({ default: true })
  isActive?: boolean;
}

export const SubjectAssignmentSchema =
  SchemaFactory.createForClass(SubjectAssignment);

// Compound unique index - prevents duplicate assignments
SubjectAssignmentSchema.index(
  { class: 1, subject: 1, academicYear: 1, term: 1 },
  { 
    unique: true,
    partialFilterExpression: { class: { $exists: true } }
  },
);

// Additional indexes for common queries
SubjectAssignmentSchema.index({ teacher: 1, academicYear: 1 });
SubjectAssignmentSchema.index({ subject: 1, academicYear: 1 });
SubjectAssignmentSchema.index({ class: 1, academicYear: 1 });
