import { Module } from '@nestjs/common';
import { SensorsModule } from '../sensors/sensors.module';
import { TelemetryController } from './telemetry.controller';

@Module({
  imports: [SensorsModule],
  controllers: [TelemetryController],
})
export class TelemetryModule {}