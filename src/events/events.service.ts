import { Injectable, Logger } from '@nestjs/common';
import { TestEventDto } from './dto/test-event.dto';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  testEvent(testEventDto: TestEventDto) {
    const event = {
      ...testEventDto,
      receivedAt: new Date(),
    };

    this.logger.log(`Evento de prueba recibido: ${testEventDto.eventId}`);

    return {
      message: 'Evento recibido correctamente',
      event,
    };
  }
}
