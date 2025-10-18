import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum Role {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
  STAFF = 'staff',
  PARENT = 'parent',
}

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

  @ApiProperty({ description: 'Reference to School _id', required: false })
  @Prop({ type: Types.ObjectId, ref: 'School', index: true })
  school?: Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);
// UserSchema.index({ email: 1 }, { unique: true });
UserSchema.set('toJSON', { versionKey: false });
UserSchema.set('toObject', { versionKey: false });
