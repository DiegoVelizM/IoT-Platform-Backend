import { Module } from '@nestjs/common';
import { SimulatorService } from './simulator.service';
import { SensorsModule } from '../sensors/sensors.module';

@Module({
  imports: [SensorsModule],
  providers: [SimulatorService],
})
export class SimulatorModule {}