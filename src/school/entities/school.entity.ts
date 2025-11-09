import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class School extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  schoolType?: string;

  @Prop({ trim: true })
  establishedYear?: number;

  @Prop({ required: true, min: 0 })
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