import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';
import {
  SensorReading,
  SensorReadingSchema,
} from './schemas/sensor-reading.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: SensorReading.name,
        schema: SensorReadingSchema,
      },
    ]),
  ],
  controllers: [SensorsController],
  providers: [SensorsService],
  exports: [SensorsService],
})
export class SensorsModule {}