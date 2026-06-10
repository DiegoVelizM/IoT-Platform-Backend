import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SensorReading } from './sensor-reading.schema';

@Schema()
export class TemperatureReading extends SensorReading {
  @Prop({ required: true })
  temperature!: number;

  @Prop()
  battery?: number;

  @Prop()
  signal_strength?: number;
}

export const TemperatureReadingSchema =
  SchemaFactory.createForClass(TemperatureReading);
