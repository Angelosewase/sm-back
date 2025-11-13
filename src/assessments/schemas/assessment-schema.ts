import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AcademicYear } from 'src/academic-year/schemas/academic-year.schema';

export enum AssessmentStatus {
  ACTIVE = 'active',
  TRASHED = 'trashed',
  DELETED = 'deleted',
  LOCKED = 'locked',
  COMPLETED = 'completed',
  PENDING = 'pending',
}

export enum AssessmentType {
    QUIZ = 'Quiz',
    EXAM = 'Exam',
    TEST = 'Test',
    HOMEWORK = 'Homework',
    CLASSWORK = 'Classwork',
}

export type AssessmentDocument = Assessment & Document;
@Schema({ timestamps: true })
export class Assessment extends Document {
  @Prop({ type: Types.ObjectId, ref: AcademicYear.name, index: true })
  academicYear: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  term: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subject', required: true, index: true })
  subject: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Class', required: true, index: true })
  class: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  title: string;

  @Prop({required: false })
  weight?: number;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, trim: true })
  AssessmentType: AssessmentType; 

  @Prop({ required: true })
  deadline: Date;

  @Prop({ type: Number, default: 100 })
  maxScore?: number;

  @Prop({
    type: String,
    enum: Object.values(AssessmentStatus),
    default: AssessmentStatus.PENDING,
    index: true,
  })
  status: AssessmentStatus;

  @Prop({ type: Types.ObjectId, ref: 'Teacher' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Teacher' })
  updatedBy?: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  submissionsCount?: number; // For analytics

  @Prop({ type: Number, default: 0 })
  averageScore?: number; // For analytics

  @Prop({ type: [Types.ObjectId], ref: 'Marks', default: [] })
  marks?: Types.ObjectId[]; 
}

export const AssessmentSchema = SchemaFactory.createForClass(Assessment);

// Composite indexes for faster analytics and search
AssessmentSchema.index({ class: 1, subject: 1, assessmentType: 1, status: 1 });
