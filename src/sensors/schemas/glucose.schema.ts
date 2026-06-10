import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SensorReading } from './sensor-reading.schema';

@Schema()
export class GlucoseReading extends SensorReading {
  @Prop({ required: true })
  glucose!: number;

  @Prop()
  battery?: number;

  @Prop()
  signal_strength?: number;
}

export const GlucoseReadingSchema =
  SchemaFactory.createForClass(GlucoseReading);
