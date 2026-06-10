import { Injectable } from '@nestjs/common';
import { TestEventDto } from './dto/test-event.dto';

@Injectable()
export class EventsService {
  testEvent(testEventDto: TestEventDto) {
    const event = {
      ...testEventDto,
      receivedAt: new Date(),
    };

    console.log('Evento de prueba recibido:', event);

    return {
      message: 'Evento recibido correctamente',
      event,
    };
  }
}
