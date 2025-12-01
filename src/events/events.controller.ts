import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service';

@ApiTags('events')
@Controller('api/events/recent')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get system events/audit logs',
    description:
      'Returns paginated list of system events/notifications with filtering.',
  })
  async getEvents(
    @Query('eventType') eventType?: string,
    @Query('user') user?: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const filter: any = {};
    if (eventType) filter.eventType = eventType;
    if (user) filter.user = user;
    if (resourceType) filter.resourceType = resourceType;
    if (resourceId) filter.resourceId = resourceId;
    return this.eventsService.getEvents(filter, page, limit);
  }
}
