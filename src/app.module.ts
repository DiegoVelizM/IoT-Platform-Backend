import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SensorsModule } from './sensors/sensors.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { HealthModule } from './health/health.module';
import { SimulatorModule } from './simulator/simulator.module';
import { AlertsModule } from './alerts/alerts.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/iot-platform'),
    SensorsModule,
    TelemetryModule,
    HealthModule,
    SimulatorModule,
    AlertsModule,
  ],
})
export class AppModule {}

