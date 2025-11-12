import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum SchoolType {
  PRIMARY = 'Primary',
  SECONDARY = 'Secondary',
  HIGHER_SECONDARY = 'Higher Secondary',
  UNIVERSITY = 'University',
  VOCATIONAL = 'Vocational',
  COLLEGE = 'College',
  OTHER = 'Other',
}
@Schema({ timestamps: true })
export class School extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  schoolType?: string;

  @Prop({ trim: true })
  establishedYear?: number;

  @Prop({ required: false, min: 0 })
  studentCapacity: number;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true, required: true })
  city: string;

  @Prop({ trim: true, required: true })
  district: string;

  @Prop({ trim: true, required: true })
  phoneNumber: string;

  @Prop({ trim: true, required: true })
  email: string;

  @Prop({ trim: true, required: true })
  website: string;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  users?: Types.ObjectId[];
}

export const SchoolSchema = SchemaFactory.createForClass(School);
SchoolSchema.set('toJSON', { versionKey: false });
SchoolSchema.set('toObject', { versionKey: false });
SchoolSchema.index({ email: 1 }, { unique: true, sparse: true });
SchoolSchema.index({ name: 1, city: 1, district: 1 }, { unique: true, sparse: true });