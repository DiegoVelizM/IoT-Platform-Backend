import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TestEventDto } from './dto/test-event.dto';
import { EventsService } from './events.service';

@ApiTags('Events')
@Controller('events')
export class EventsController {
    constructor(private readonly eventsService: EventsService) {}

    @Post('test')
    @ApiOperation({ summary: 'Probar recepción de evento temporal' })
    testEvent(@Body() testEventDto: TestEventDto) {
        return this.eventsService.testEvent(testEventDto);
    }
    }