import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SystemEvent,
  SystemEventDocument,
} from '../schemas/system-event.schema';
import { EventPayload } from '../interfaces/event-payload.interface';

@Injectable()
export class SystemEventService {
  private readonly logger = new Logger(SystemEventService.name);

  constructor(
    @InjectModel(SystemEvent.name)
    private readonly systemEventModel: Model<SystemEventDocument>,
  ) {}

  /**
   * Log a system event
   */
  async logEvent(payload: EventPayload): Promise<SystemEvent> {
    try {
      const event = new this.systemEventModel({
        eventType: payload.eventType,
        eventName: payload.eventName,
        description: payload.description,
        details: payload.details || {},
        triggeredBy: payload.triggeredBy
          ? new Types.ObjectId(payload.triggeredBy)
          : undefined,
        resourceId: payload.resourceId
          ? new Types.ObjectId(payload.resourceId)
          : undefined,
        resourceType: payload.resourceType,
        school: payload.school ? new Types.ObjectId(payload.school) : undefined,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
        severity: payload.severity || 'info',
        status: 'success',
        timestamp: new Date(),
      });

      return await event.save();
    } catch (error) {
      this.logger.error(`Failed to log event: ${payload.eventName}`, error);
      throw error;
    }
  }

  /**
   * Log a failed event
   */
  async logFailedEvent(
    payload: EventPayload,
    errorMessage: string,
  ): Promise<SystemEvent> {
    try {
      const event = new this.systemEventModel({
        eventType: payload.eventType,
        eventName: payload.eventName,
        description: payload.description,
        details: payload.details || {},
        triggeredBy: payload.triggeredBy
          ? new Types.ObjectId(payload.triggeredBy)
          : undefined,
        resourceId: payload.resourceId
          ? new Types.ObjectId(payload.resourceId)
          : undefined,
        resourceType: payload.resourceType,
        school: payload.school ? new Types.ObjectId(payload.school) : undefined,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
        severity: payload.severity || 'warning',
        status: 'failed',
        errorMessage,
        timestamp: new Date(),
      });

      return await event.save();
    } catch (error) {
      this.logger.error(
        `Failed to log failed event: ${payload.eventName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get events with filters
   */
  async getEvents(filters: {
    eventType?: string;
    resourceType?: string;
    school?: string;
    severity?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      eventType,
      resourceType,
      school,
      severity,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;

    const query: any = {};

    if (eventType) query.eventType = eventType;
    if (resourceType) query.resourceType = resourceType;
    if (school) query.school = new Types.ObjectId(school);
    if (severity) query.severity = severity;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      this.systemEventModel
        .find(query)
        .populate('triggeredBy', 'email name role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.systemEventModel.countDocuments(query),
    ]);

    return {
      events,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get recent events for dashboard
   */
  async getRecentEvents(limit = 10): Promise<SystemEvent[]> {
    return this.systemEventModel
      .find()
      .populate('triggeredBy', 'email name')
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get event statistics
   */
  async getEventStats(school?: string) {
    const query = school ? { school: new Types.ObjectId(school) } : {};

    const [byEventType, byResourceType, bySeverity, byStatus] =
      await Promise.all([
        this.systemEventModel.aggregate([
          { $match: query },
          { $group: { _id: '$eventType', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        this.systemEventModel.aggregate([
          { $match: query },
          { $group: { _id: '$resourceType', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        this.systemEventModel.aggregate([
          { $match: query },
          { $group: { _id: '$severity', count: { $sum: 1 } } },
        ]),
        this.systemEventModel.aggregate([
          { $match: query },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
      ]);

    return {
      byEventType,
      byResourceType,
      bySeverity,
      byStatus,
    };
  }

  /**
   * Clear old events (for maintenance)
   */
  async clearOldEvents(
    daysOld: number = 90,
  ): Promise<{ deletedCount: number }> {
    const date = new Date();
    date.setDate(date.getDate() - daysOld);

    const result = await this.systemEventModel.deleteMany({
      timestamp: { $lt: date },
    });

    this.logger.log(
      `Cleared ${result.deletedCount} events older than ${daysOld} days`,
    );
    return { deletedCount: result.deletedCount };
  }
}
