import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StudentDocument = Student & Document;

export enum StudentStatus {
  ACTIVE = 'active',
  GRADUATED = 'graduated',
  TRANSFERRED = 'transferred',
  SUSPENDED = 'suspended',
}

export enum GuardianRelationShip {
  FATHER = 'father',
  MOTHER = 'mother',
  GUARDIAN = 'guardian',
  OTHER = 'other',
}

@Schema({ timestamps: true })
export class Student {
  @Prop({ required: true, trim: true, index: true })
  studentId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop({ trim: true })
  phoneNumber?: string;
  
  @Prop({ type: Date })
  dob?: Date;

  @Prop({ trim: true })
  gender?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  district?: string;

  @Prop({ trim: true })
  province?: string;

  @Prop({ trim: true })
  gradeLevel?: string;

  @Prop({ type: Types.ObjectId, ref: 'Class', default: null })
  class?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'School', index: true })
  school?: Types.ObjectId;

  @Prop({ trim: true })
  previousSchool?: string;

  @Prop({ type: Date })
  enrollmentDate?: Date;

  @Prop({ trim: true })
  guardianName?: string;

  @Prop({ trim: true })
  guardianPhoneNumber?: string;

  @Prop({ trim: true, lowercase: true })
  guardianEmail?: string;

  @Prop({
    type: String,
    enum: Object.values(GuardianRelationShip),
    default: GuardianRelationShip.GUARDIAN,
  })
  guardianRelationShip: GuardianRelationShip;

  @Prop({ trim: true })
  guardianEmergencyContact?: string;

  @Prop({ trim: true })
  medicalInformation?: string;

  @Prop({ trim: true })
  additionalNotes?: string;

  @Prop({
    type: String,
    enum: Object.values(StudentStatus),
    default: StudentStatus.ACTIVE,
  })
  status: StudentStatus;

  @Prop({ default: false })
  isTrashed: boolean;

  @Prop({ type: Date, default: null })
  trashedAt?: Date | null;
}

export const StudentSchema = SchemaFactory.createForClass(Student);
StudentSchema.index({ studentId: 1, school: 1 }, { unique: true });
