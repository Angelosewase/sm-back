import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EnrollmentDocument = Enrollment & Document;

export enum EnrollmentStatus {
  ENROLLED = 'enrolled',
  PROMOTED = 'promoted',
  LEFT = 'left',
  REPEATED = 'repeated',
  GRADUATED = 'graduated',
  TRANSFERRED = 'transferred',
}

@Schema({ timestamps: true })
export class Enrollment {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, index: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Class', required: true, index: true })
  class: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'School', index: true })
  school?: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  academicYear: string;

  @Prop()
  entryDate?: Date;

  @Prop()
  exitDate?: Date;

  @Prop({
    type: String,
    enum: Object.values(EnrollmentStatus),
    default: EnrollmentStatus.ENROLLED,
  })
  status: EnrollmentStatus;

  @Prop({ trim: true })
  reason?: string;
}

export const EnrollmentSchema = SchemaFactory.createForClass(Enrollment);
EnrollmentSchema.index({ student: 1, academicYear: 1 }, { unique: false });
EnrollmentSchema.index({ class: 1, academicYear: 1 });
