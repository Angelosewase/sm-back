import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubjectDocument = Subject & Document;

export enum SubjectType {
  CORE = 'core',
  OPTIONAL = 'optional',
  ELECTIVE = 'elective',
  VOCATIONAL = 'vocational',
}

export enum GradeLevel {
  NURSERY_1 = 'ns1',
  NURSERY_2 = 'ns2',
  NURSERY_3 = 'ns3',
  PRIMARY_1 = 'p1',
  PRIMARY_2 = 'p2',
  PRIMARY_3 = 'p3',
  PRIMARY_4 = 'p4',
  PRIMARY_5 = 'p5',
  PRIMARY_6 = 'p6',
}

export enum SubjectStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
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

  @Prop({ type: [String], enum: Object.values(GradeLevel), default: [] })
  gradeLevels?: GradeLevel[];

  @Prop({ trim: true })
  prerequisites?: string;


  @Prop({
    trim: true,
    index: true,
    enum: Object.values(SubjectStatus),
    default: SubjectStatus.ACTIVE,
  })
  status?: string;

  @Prop({ type: Types.ObjectId, ref: 'School' })
  school?: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'Assessment', default: [] })
  assessments?: Types.ObjectId[];

  @Prop({ default: false })
  isTrashed?: boolean;

  @Prop({ type: Date, default: null })
  trashedAt?: Date | null;
}

export const SubjectSchema = SchemaFactory.createForClass(Subject);
SubjectSchema.index({ school: 1, code: 1 }, { unique: false });
