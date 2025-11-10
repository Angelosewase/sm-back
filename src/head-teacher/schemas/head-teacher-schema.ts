import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HeadTeacherDocument = HeadTeacher & Document;

@Schema({ timestamps: true })
export class HeadTeacher {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ trim: true })
  headTeacherId?: string;

  @Prop({ trim: true }) // Custom for head teacher
  department?: string;

  @Prop({ type: [Types.ObjectId], ref: 'Subject', default: [] }) // Optional for head teachers
  subjects?: Types.ObjectId[];

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true })
  qualification?: string;

  @Prop()
  hireDate?: Date;

  @Prop({ type: Types.ObjectId, ref: 'School', index: true })
  school?: Types.ObjectId;

  // Added fields based on form (HeadTeacher-specific: e.g., department required, status, etc.)
  @Prop({ trim: true, enum: ['Active', 'On Leave', 'Inactive'], default: 'Active' })
  status?: string;

  @Prop({ trim: true })
  address?: string;

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
}

export const HeadTeacherSchema = SchemaFactory.createForClass(HeadTeacher);