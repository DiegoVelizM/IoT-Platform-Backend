import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SensorReading } from './sensor-reading.schema';

@Schema()
export class BloodPressureReading extends SensorReading {
  @Prop({ required: true })
  systolic!: number;

  @Prop({ required: true })
  diastolic!: number;

  @Prop()
  battery?: number;

  @Prop()
  signal_strength?: number;
}

export const BloodPressureReadingSchema =
  SchemaFactory.createForClass(BloodPressureReading);
