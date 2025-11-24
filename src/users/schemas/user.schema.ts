import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum Role {
  SUPER_ADMIN = 'super admin',
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
  HEADTeacher = 'head teacher',
  STAFF = 'staff',
  PARENT = 'parent',
}

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User extends Document {
  @ApiProperty({ example: 'user@example.com' })
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @ApiProperty({ example: 'hashed_password' })
  @Prop({ required: true, select: false })
  password: string;

  @ApiProperty({ required: false })
  @Prop({ trim: true })
  name?: string;

  @ApiProperty({ enum: Role, default: Role.STAFF })
  @Prop({ enum: Role, default: Role.STAFF, index: true })
  role: Role;

  @ApiProperty({ required: false })
  @Prop({ trim: true })
  phone?: string;

  @ApiProperty({
    required: false,
    description: 'Filename of uploaded avatar image',
  })
  @Prop({ trim: true })
  avatar?: string;

  @ApiProperty({
    required: false,
    description: "Experience of the user but optional"
  })
  @Prop({ trim: true , optional: true})
  experience?: string;

  @ApiProperty({ description: 'Reference to School _id', required: false })
  @Prop({ type: Types.ObjectId, ref: 'School', index: true })
  school?: Types.ObjectId;

  @ApiProperty({
    description: 'Classes assigned to the teacher',
    required: false,
    type: [String],
  })
  @Prop({ type: [Types.ObjectId], ref: 'Class', default: [] })
  assignedClasses?: Types.ObjectId[];

  @ApiProperty({
    description: 'Subjects the teacher can teach',
    required: false,
    type: [String],
  })
  @Prop({ type: [Types.ObjectId], ref: 'Subject', default: [] })
  subjectsCanTeach?: Types.ObjectId[];

  @ApiProperty({ description: 'Years of professional experience', required: false })
  @Prop({ type: Number, min: 0 })
  yearsOfExperience?: number;

  @ApiProperty({ description: 'List of qualifications or certifications', required: false, type: [String] })
  @Prop({ type: [String], default: [] })
  qualifications?: string[];

  @ApiProperty({ description: 'Street address', required: false })
  @Prop({ trim: true })
  address?: string;

  @ApiProperty({ description: 'City of residence', required: false })
  @Prop({ trim: true })
  city?: string;

  @ApiProperty({ description: 'State or region of residence', required: false })
  @Prop({ trim: true })
  state?: string;

  @ApiProperty({ description: 'Postal or ZIP code', required: false })
  @Prop({ trim: true })
  zipCode?: string;

  @ApiProperty({ description: 'Emergency contact information', required: false })
  @Prop({ trim: true })
  emergencyContact?: string;

  @ApiProperty({ description: 'Additional notes about the user', required: false })
  @Prop({ trim: true })
  additionalNotes?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
// UserSchema.index({ email: 1 }, { unique: true });
UserSchema.set('toJSON', { versionKey: false });
UserSchema.set('toObject', { versionKey: false });
