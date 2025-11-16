import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SystemEventService } from './system-event.service';
import { EventPayload } from '../interfaces/event-payload.interface';

@Injectable()
export class EventListenerService {
  private readonly logger = new Logger(EventListenerService.name);

  constructor(private readonly systemEventService: SystemEventService) {}

  /**
   * Generic event listener that persists all events to database
   */
  @OnEvent('system.**', { async: true })
  async handleSystemEvent(payload: EventPayload) {
    try {
      await this.systemEventService.logEvent(payload);
      this.logger.debug(
        `Event logged: ${payload.eventName} (${payload.eventType})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle system event: ${payload.eventName}`,
        error,
      );
    }
  }

  /**
   * Specific listener for critical events
   */
  @OnEvent('critical.**', { async: true })
  async handleCriticalEvent(payload: EventPayload) {
    this.logger.warn(
      `CRITICAL EVENT: ${payload.eventName} - ${payload.description}`,
    );
    // Could trigger notifications, alerts, etc.
  }
}
