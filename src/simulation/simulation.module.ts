import { Module } from '@nestjs/common';
import { SensorsModule } from '../sensors/sensors.module';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';
import { SimulationApiKeyGuard } from './guards/simulation-api-key.guard';

@Module({
  imports: [SensorsModule],
  controllers: [SimulationController],
  providers: [SimulationService, SimulationApiKeyGuard],
})
export class SimulationModule {}