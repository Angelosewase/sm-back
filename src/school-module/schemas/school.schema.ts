import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class School extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  location?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  contactPhone?: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  contactEmail: string;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  users?: Types.ObjectId[];
}

export const SchoolSchema = SchemaFactory.createForClass(School);
// SchoolSchema.index({ contactEmail: 1 }, { unique: true });
