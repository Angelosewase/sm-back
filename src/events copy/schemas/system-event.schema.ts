import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EventType } from '../enums/event-type.enum';

export type SystemEventDocument = SystemEvent & Document;

@Schema({ timestamps: true })
export class SystemEvent {
  @Prop({ required: true, enum: Object.values(EventType) })
  eventType: EventType;

  @Prop({ required: true })
  eventName: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  details?: Record<string, any>;

  // The user who triggered the event
  @Prop({ type: Types.ObjectId, ref: 'User' })
  triggeredBy?: Types.ObjectId;

  // The resource affected by the event
  @Prop({ type: Types.ObjectId })
  resourceId?: Types.ObjectId;

  // Type of resource affected (e.g., 'Teacher', 'Student', 'Class')
  @Prop()
  resourceType?: string;

  // School context
  @Prop({ type: Types.ObjectId, ref: 'School' })
  school?: Types.ObjectId;

  // IP address of the request (for audit trail)
  @Prop()
  ipAddress?: string;

  // User agent
  @Prop()
  userAgent?: string;

  // Status of the operation
  @Prop({ enum: ['success', 'failed'], default: 'success' })
  status?: string;

  // Error message if operation failed
  @Prop()
  errorMessage?: string;

  // Severity level for filtering/alerting
  @Prop({ enum: ['info', 'warning', 'critical'], default: 'info' })
  severity?: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const SystemEventSchema = SchemaFactory.createForClass(SystemEvent);

// Index for common queries
SystemEventSchema.index({ eventType: 1, timestamp: -1 });
SystemEventSchema.index({ resourceId: 1, resourceType: 1 });
SystemEventSchema.index({ school: 1, timestamp: -1 });
SystemEventSchema.index({ triggeredBy: 1, timestamp: -1 });
SystemEventSchema.index({ severity: 1, timestamp: -1 });
