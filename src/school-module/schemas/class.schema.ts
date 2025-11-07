import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClassDocument = Class & Document;

export enum ClassStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  CLOSED = 'closed',
}

@Schema({ timestamps: true })
export class Class {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  code?: string;

  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  school: Types.ObjectId;

  @Prop({ required: true, trim: true })
  academicYear: string;

  @Prop({ trim: true, index: true })
  level?: string;

  @Prop({ trim: true })
  program?: string;

  @Prop({ trim: true })
  stream?: string;

  @Prop()
  capacity?: number;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  formTeacher?: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  assignedTeachers?: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'Subject', default: [] })
  subjects?: Types.ObjectId[];

  @Prop({
    type: String,
    enum: Object.values(ClassStatus),
    default: ClassStatus.ACTIVE,
    index: true,
  })
  status: ClassStatus;
}

export const ClassSchema = SchemaFactory.createForClass(Class);
ClassSchema.index({ school: 1, academicYear: 1, name: 1 }, { unique: true });
ClassSchema.index({ school: 1 });
ClassSchema.index({ academicYear: 1 });
