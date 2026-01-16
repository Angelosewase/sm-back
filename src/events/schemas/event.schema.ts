import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum EventTypeI {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  ASSIGN = 'assign',
  UNASSIGN = 'unassign',
  RESTORE = 'restore',
  TRASH = 'trash',
  LOGIN = 'login',
  LOGOUT = 'logout',
  OTHER = 'other',
}

export type EventDocument = Event & Document;

@Schema({ timestamps: true })
export class Event {
  @Prop({ type: String, enum: EventTypeI, required: true })
  eventType: EventTypeI;

  @Prop({ trim: true, required: true })
  details: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  user?: Types.ObjectId;

  @Prop({ type: String, required: false })
  resourceType?: string;

  @Prop({ type: Types.ObjectId, required: false })
  resourceId?: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  occurredAt?: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);
