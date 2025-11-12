import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TeacherDocument = Teacher & Document;
@Schema({ timestamps: true })
export class Teacher {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ trim: true })
  teacherId?: string;

  @Prop({ trim: true })
  department?: string;

  @Prop({ type: [Types.ObjectId], ref: 'Subject', default: [] })
  subjectsCanTeach?: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'Class', default: [] })
  assignedClasses?: Types.ObjectId[];

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  qualification?: string;

  @Prop()
  hireDate?: Date;

  @Prop({ type: Types.ObjectId, ref: 'School', index: true })
  school?: Types.ObjectId;

  // Added fields based on form for customization (Teacher-specific: e.g., no department, but add experience if needed; experience is in User)
  @Prop({ trim: true, enum: ['Active', 'On Leave', 'Inactive'], default: 'Active' })
  status?: string;

  @Prop({ trim: true })
  city?: string;

  @Prop({ trim: true })
  state?: string;

  @Prop({ trim: true })
  zip?: string;

  @Prop({ trim: true })
  emergencyContact?: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ trim: true })
  experience?: string;

  @Prop({ default: false })
  isTrashed?: boolean;

  @Prop({ type: Date, default: null })
  trashedAt?: Date | null;
}

export const TeacherSchema = SchemaFactory.createForClass(Teacher);