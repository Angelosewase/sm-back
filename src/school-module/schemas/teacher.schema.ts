import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TeacherDocument = Teacher & Document;

@Schema({ timestamps: true })
export class Teacher {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ trim: true })
  teacherId?: string;

  @Prop({ type: [Types.ObjectId], ref: 'Subject', default: [] })
  subjectsCanTeach?: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'Class', default: [] })
  assignedClasses?: Types.ObjectId[];

  @Prop({ default: false })
  isHeadTeacher?: boolean;

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

  @Prop({ type: Number, min: 0 })
  yearsOfExperience?: number;

  @Prop({ type: [String], default: [] })
  qualifications?: string[];

  @Prop({ trim: true })
  city?: string;

  @Prop({ trim: true })
  state?: string;

  @Prop({ trim: true })
  zipCode?: string;

  @Prop({ trim: true })
  emergencyContact?: string;

  @Prop({ trim: true })
  additionalNotes?: string;
}

export const TeacherSchema = SchemaFactory.createForClass(Teacher);
