import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../users/schemas/user.schema';

export enum TokenStatus {
  PENDING = 'pending',
  USED = 'used',
  EXPIRED = 'expired',
}

export type RegistrationTokenDocument = RegistrationToken & Document;

@Schema({ timestamps: true })
export class RegistrationToken extends Document {
  @ApiProperty({ example: 'abc123def456' })
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  token: string;

  @ApiProperty({ enum: [Role.SCHOOL_OWNER, Role.TEACHER, Role.HEADTeacher] })
  @Prop({ 
    type: String,
    required: true,
    enum: [Role.SCHOOL_OWNER, Role.TEACHER, Role.HEADTeacher],
    index: true,
  })
  role: Role;

  @ApiProperty({ 
    description: 'School ID - null for SCHOOL_OWNER, required for TEACHER and HEADTEACHER',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'School', index: true })
  schoolId?: Types.ObjectId | null;

  @ApiProperty({ example: '2024-12-31T23:59:59Z' })
  @Prop({ required: true, index: true })
  expiresAt: Date;

  @ApiProperty({ description: 'ID of the user who created this token' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy: Types.ObjectId;

  @ApiProperty({ enum: TokenStatus, default: TokenStatus.PENDING })
  @Prop({ 
    type: String,
    enum: TokenStatus, 
    default: TokenStatus.PENDING,
    index: true,
  })
  status: TokenStatus;

  @ApiProperty({ required: false, description: 'When the token was used' })
  @Prop({ type: Date, default: null })
  usedAt?: Date | null;

  @ApiProperty({ required: false, description: 'ID of the user who used this token' })
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  usedBy?: Types.ObjectId | null;

  @ApiProperty({ required: false, description: 'IP address from which token was used' })
  @Prop({ type: String, trim: true, default: null })
  usedFromIp?: string | null;

  @ApiProperty({ description: 'Timestamp when the token was created' })
  createdAt?: Date;

  @ApiProperty({ description: 'Timestamp when the token was last updated' })
  updatedAt?: Date;
}

export const RegistrationTokenSchema = SchemaFactory.createForClass(RegistrationToken);
RegistrationTokenSchema.index({ token: 1 }, { unique: true });
RegistrationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired tokens
RegistrationTokenSchema.index({ status: 1, expiresAt: 1 });
RegistrationTokenSchema.set('toJSON', { versionKey: false });
RegistrationTokenSchema.set('toObject', { versionKey: false });

