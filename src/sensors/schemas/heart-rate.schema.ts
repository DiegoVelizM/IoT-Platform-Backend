import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SensorReading } from './sensor-reading.schema';

@Schema()
export class HeartRateReading extends SensorReading {
  @Prop({ required: true })
  heart_rate!: number;

  @Prop()
  battery?: number;

  @Prop()
  signal_strength?: number;
}

export const HeartRateReadingSchema =
  SchemaFactory.createForClass(HeartRateReading);
