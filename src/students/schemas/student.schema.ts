import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StudentDocument = Student & Document;

export enum StudentStatus {
  ACTIVE = 'active',
  GRADUATED = 'graduated',
  TRANSFERRED = 'transferred',
  SUSPENDED = 'suspended',
}

@Schema({ timestamps: true })
export class Student {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user?: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  studentId: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ trim: true })
  otherNames?: string;

  @Prop({ trim: true })
  fullName?: string;

  @Prop({ trim: true })
  gender?: string;

  @Prop()
  dob?: Date;

  @Prop()
  admissionDate?: Date;

  @Prop({ type: Types.ObjectId, ref: 'School', index: true })
  school?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Class' })
  currentClass?: Types.ObjectId;

  @Prop({ type: Array, default: [] })
  enrollments?: any[];

  @Prop({ type: Array, default: [] })
  parentContacts?: any[];

  @Prop({
    type: String,
    enum: Object.values(StudentStatus),
    default: StudentStatus.ACTIVE,
  })
  status: StudentStatus;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const StudentSchema = SchemaFactory.createForClass(Student);
StudentSchema.index({ studentId: 1, school: 1 }, { unique: true });
