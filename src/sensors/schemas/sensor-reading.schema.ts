import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SensorReadingDocument = HydratedDocument<SensorReading>;

@Schema({ timestamps: true })
export class SensorReading {
  @Prop({ required: true })
  sensorId!: string;

  @Prop({ required: true })
  location!: string;

  @Prop({ required: true })
  temperature!: number;

  @Prop({ required: true })
  humidity!: number;

  @Prop({ required: true })
  gasLevel!: number;

  @Prop({ required: true })
  batteryLevel!: number;

  @Prop({ required: true })
  latitude!: number;

  @Prop({ required: true })
  longitude!: number;

  @Prop({ required: true, default: Date.now })
  timestamp!: Date;
}

export const SensorReadingSchema = SchemaFactory.createForClass(SensorReading);

SensorReadingSchema.index({ sensorId: 1, createdAt: -1 });
SensorReadingSchema.index({ createdAt: -1 });
SensorReadingSchema.index({ timestamp: -1 });
