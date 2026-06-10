import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SensorReading } from './sensor-reading.schema';

@Schema()
export class EnvironmentalReading extends SensorReading {
  @Prop()
  temperature?: number;

  @Prop()
  humidity?: number;

  @Prop()
  gasLevel?: number;

  @Prop()
  batteryLevel?: number;
}

export const EnvironmentalReadingSchema =
  SchemaFactory.createForClass(EnvironmentalReading);
