import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  ConnectionStatus,
  MedicalSensorType,
} from '../dto/create-sensor-reading.dto';

const DEFAULT_READINGS_TTL_DAYS = 7;
const SECONDS_PER_DAY = 86_400;

function resolveReadingsTtlDays(): number {
  const parsed = Number(process.env.READINGS_TTL_DAYS);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_READINGS_TTL_DAYS;
  }

  return Math.floor(parsed);
}
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

const readingsTtlDays = resolveReadingsTtlDays();
if (readingsTtlDays > 0) {
  SensorReadingSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: readingsTtlDays * SECONDS_PER_DAY },
  );
}