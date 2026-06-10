import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule, InjectConnection } from '@nestjs/mongoose';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';
import { AlertsModule } from '../alerts/alerts.module';
import {
  SensorReading,
  SensorReadingSchema,
} from './schemas/sensor-reading.schema';
import { Connection } from 'mongoose';
import { TemperatureReadingSchema } from './schemas/temperature.schema';
import { GlucoseReadingSchema } from './schemas/glucose.schema';
import { HeartRateReadingSchema } from './schemas/heart-rate.schema';
import { BloodPressureReadingSchema } from './schemas/blood-pressure.schema';
import { EnvironmentalReadingSchema } from './schemas/environmental.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: SensorReading.name,
        schema: SensorReadingSchema,
      },
    ]),
    AlertsModule,
  ],
  controllers: [SensorsController],
  providers: [SensorsService],
  exports: [SensorsService],
})
export class SensorsModule implements OnModuleInit {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  onModuleInit() {
    try {
      const baseModel = this.connection.model('SensorReading');
      // register discriminators
      baseModel.discriminator('temperature', TemperatureReadingSchema);
      baseModel.discriminator('glucose', GlucoseReadingSchema);
      baseModel.discriminator('heart_rate', HeartRateReadingSchema);
      baseModel.discriminator('blood_pressure', BloodPressureReadingSchema);
      baseModel.discriminator('environmental', EnvironmentalReadingSchema);
    } catch (err) {
      // models might already be registered in hot reload; ignore
    }
  }
}
