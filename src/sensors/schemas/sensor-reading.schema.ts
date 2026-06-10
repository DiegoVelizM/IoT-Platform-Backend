import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SensorReadingDocument = HydratedDocument<SensorReading>;

@Schema({
  collection: 'sensor_readings',
  timestamps: true,
  discriminatorKey: 'sensor_type',
})
export class SensorReading {
  @Prop({ required: true })
  sensor_id!: string;

  @Prop()
  asset_id?: string;

  @Prop({ required: true })
  sensor_type!: string;

  @Prop({ required: true, default: Date.now })
  timestamp!: Date;
}

export const SensorReadingSchema = SchemaFactory.createForClass(SensorReading);
