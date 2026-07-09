import { Module } from '@nestjs/common';
import { SensorsModule } from '../sensors/sensors.module';
import { DemoTelemetryController } from './demo-telemetry.controller';
import { DemoTelemetryService } from './demo-telemetry.service';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';
import { SimulationApiKeyGuard } from './guards/simulation-api-key.guard';

@Module({
  imports: [SensorsModule],
  controllers: [SimulationController, DemoTelemetryController],
  providers: [SimulationService, DemoTelemetryService, SimulationApiKeyGuard],
})
export class SimulationModule {}