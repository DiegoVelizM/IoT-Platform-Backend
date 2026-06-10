import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TestEventDto } from './dto/test-event.dto';
import { EventsService } from './events.service';
import { AlertsService } from '../alerts/alerts.service';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly alertsService: AlertsService,
  ) {}

  @Post('test')
  @ApiOperation({ summary: 'Probar recepción de evento temporal' })
  testEvent(@Body() testEventDto: TestEventDto) {
    return this.eventsService.testEvent(testEventDto);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Últimos eventos / alertas (20)' })
  recentEvents() {
    return this.alertsService.findAll().then((list) => list.slice(0, 20));
  }
}
