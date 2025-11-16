import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventType } from './schemas/event.schema';
import { EventEmitter2 } from 'eventemitter2';

@Injectable()
export class EventListenerService {
  private readonly logger = new Logger(EventListenerService.name);
  constructor(
    private readonly eventsService: EventsService,
    @Inject('EVENT_EMITTER') private readonly eventEmitter: EventEmitter2,
  ) {
    this.eventEmitter.onAny(async (event, ...args) => {
      try {
        // args: [details, user, resourceType, resourceId]
        const [details, user, resourceType, resourceId] = args;
        await this.eventsService.logEvent(
          event as EventType,
          details,
          user,
          resourceType,
          resourceId,
        );
      } catch (error) {
        this.logger.error('Failed to persist event', error as any);
      }
    });
  }
}
