import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { TestEventDto } from './dto/test-event.dto';
import { EventsService } from './events.service';

@ApiTags('Events')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('test')
  @ApiOperation({ summary: 'Probar recepción de evento temporal' })
  testEvent(@Body() testEventDto: TestEventDto) {
    return this.eventsService.testEvent(testEventDto);
  }
}
