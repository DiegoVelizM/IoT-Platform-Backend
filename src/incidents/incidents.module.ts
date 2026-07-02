import { Global, Module } from '@nestjs/common';
import { IncidentsEventsService } from './incidents-events.service';

@Global()
@Module({
  providers: [IncidentsEventsService],
  exports: [IncidentsEventsService],
})
export class IncidentsModule {}
