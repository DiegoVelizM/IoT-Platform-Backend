import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiWriteErrors } from '../common/decorators/api-standard-errors.decorator';
import { TestEventDto } from './dto/test-event.dto';
import { EventsService } from './events.service';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';
import { ApiInternalKeyRequired } from '../alerts/decorators/api-internal-key.decorator';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('test')
  @UseGuards(InternalApiKeyGuard)
  @ApiInternalKeyRequired()
  @ApiOperation({
    summary: 'Probar recepción de evento temporal',
    description:
      'Valida el contrato del DTO de eventos. No publica a Kafka; registra el evento en consola del servidor.',
  })
  @ApiOkResponse({ description: 'Evento recibido y eco de confirmación' })
  @ApiWriteErrors()
  testEvent(@Body() testEventDto: TestEventDto) {
    return this.eventsService.testEvent(testEventDto);
  }
}