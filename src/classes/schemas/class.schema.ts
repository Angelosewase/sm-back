import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export enum ClassStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export type ClassDocument = Class & Document;

@Schema({ timestamps: true })
export class Class extends Document {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  gradeLevel: string;

  @Prop({ required: true, min: 0 })
  capacity: number;

  @Prop({ required: true, min: 0, default: 0 })
  studentCount: number;

  @Prop({ trim: true })
  description?: string;

  @Prop({
    required: true,
    enum: ClassStatus,
    default: ClassStatus.ACTIVE,
  })
  status: ClassStatus;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    default: null,
  })
  classTeacher?: Types.ObjectId | null;

  @Prop({ default: false })
  isTrashed: boolean;

  @Prop({ type: Date, default: null })
  trashedAt?: Date | null;
}

export const ClassSchema = SchemaFactory.createForClass(Class);

