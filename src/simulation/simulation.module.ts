import { Module } from '@nestjs/common';
import { SensorsModule } from '../sensors/sensors.module';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';

@Module({
  imports: [SensorsModule],
  controllers: [SimulationController],
  providers: [SimulationService],
})
export class SimulationModule {}
