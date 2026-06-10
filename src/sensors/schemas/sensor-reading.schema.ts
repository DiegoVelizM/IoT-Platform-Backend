import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  ConnectionStatus,
  MedicalSensorType,
} from '../dto/create-sensor-reading.dto';

export type SensorReadingDocument = HydratedDocument<SensorReading>;

@Schema({ timestamps: true })
export class SensorReading {
  @Prop({ required: true })
  sensorId!: string;

  @Prop({ required: true })
  assetId!: string;

  @Prop({
    required: true,
    enum: Object.values(MedicalSensorType),
  })
  sensorType!: MedicalSensorType;

  @Prop()
  batteryLevel?: number;

  @Prop({
    enum: Object.values(ConnectionStatus),
    default: ConnectionStatus.CONNECTED,
  })
  connectionStatus?: ConnectionStatus;

  /*@Prop()
  signalStrength?: number;
  */

  @Prop()
  temperature?: number;

  @Prop()
  glucoseLevel?: number;

  @Prop()
  oxygenSaturation?: number;

  @Prop()
  heartRate?: number;

  @Prop()
  systolicPressure?: number;

  @Prop()
  diastolicPressure?: number;
}

export const SensorReadingSchema = SchemaFactory.createForClass(SensorReading);