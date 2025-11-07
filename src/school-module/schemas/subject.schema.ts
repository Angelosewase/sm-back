import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubjectDocument = Subject & Document;

export enum SubjectType {
  CORE = 'core',
  OPTIONAL = 'optional',
  ELECTIVE = 'elective',
  VOCATIONAL = 'vocational',
}

@Schema({ timestamps: true })
export class Subject {
  @Prop({ trim: true, unique: true })
  code?: string;

  @Prop({ required: true, trim: true, index: true, unique: true })
  name: string;

  @Prop({ trim: true })
  shortName?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  department?: string;

  @Prop({
    type: String,
    enum: Object.values(SubjectType),
    default: SubjectType.CORE,
  })
  subjectType?: SubjectType;

  @Prop({ type: Number, default: 100 })
  maxScore?: number;

  @Prop({ type: Number, default: 50 })
  minPassingScore?: number;

  @Prop({ type: Number })
  creditHours?: number;

  @Prop({ trim: true })
  level?: string;

  @Prop({ type: [String], default: [] })
  gradeLevels?: string[];

  @Prop({ trim: true })
  prerequisites?: string;

  @Prop({ trim: true, index: true, default: 'active' })
  status?: string;

  @Prop({ type: Types.ObjectId, ref: 'School' })
  school?: Types.ObjectId;
}

export const SubjectSchema = SchemaFactory.createForClass(Subject);
SubjectSchema.index({ school: 1, code: 1 }, { unique: false });
