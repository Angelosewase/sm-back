import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum RegistrationRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export type RegistrationRequestDocument = RegistrationRequest & Document;

@Schema({ timestamps: true })
export class RegistrationRequest extends Document {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the requester' })
  @Prop({
    required: true,
    trim: true,
    index: true,
  })
  fullName: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email address of the requester' })
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @ApiProperty({ 
    example: 'I would like to register as a school owner', 
    description: 'Additional notes from the requester',
    required: false,
  })
  @Prop({
    trim: true,
    default: '',
  })
  additionalNotes?: string;

  @ApiProperty({ 
    enum: RegistrationRequestStatus, 
    default: RegistrationRequestStatus.PENDING,
    description: 'Status of the registration request',
  })
  @Prop({
    type: String,
    enum: RegistrationRequestStatus,
    default: RegistrationRequestStatus.PENDING,
    index: true,
  })
  status: RegistrationRequestStatus;

  @ApiProperty({ 
    required: false, 
    description: 'ID of the super admin who reviewed this request' 
  })
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  reviewedBy?: Types.ObjectId | null;

  @ApiProperty({ 
    required: false, 
    description: 'Timestamp when the request was reviewed' 
  })
  @Prop({ type: Date, default: null })
  reviewedAt?: Date | null;

  @ApiProperty({ description: 'Timestamp when the request was created' })
  createdAt?: Date;

  @ApiProperty({ description: 'Timestamp when the request was last updated' })
  updatedAt?: Date;
}

export const RegistrationRequestSchema = SchemaFactory.createForClass(RegistrationRequest);
RegistrationRequestSchema.index({ email: 1 }, { unique: true });
RegistrationRequestSchema.index({ status: 1, createdAt: -1 });
RegistrationRequestSchema.set('toJSON', { versionKey: false });
RegistrationRequestSchema.set('toObject', { versionKey: false });

