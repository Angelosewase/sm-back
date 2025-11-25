import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument, EventType } from './schemas/event.schema';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  async logEvent(
    eventType: EventType,
    details: string,
    user?: string,
    resourceType?: string,
    resourceId?: string,
  ) {
    try {
      const event = new this.eventModel({
        eventType,
        details,
        user,
        resourceType,
        resourceId,
        occurredAt: new Date(),
      });
      await event.save();
      this.logger.log(`Event logged: ${eventType} - ${details}`);
      return event;
    } catch (error) {
      this.logger.error('Failed to log event', error as any);
      throw error;
    }
  }

  async getEvents(filter: any = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const events = await this.eventModel
      .find(filter)
      .sort({ occurredAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user')
      .exec();
    const total = await this.eventModel.countDocuments(filter).exec();
    return {
      events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
