import { MedicalSensorType } from 'src/sensors/dto/create-sensor-reading.dto';

export type SensorStatus = 'active' | 'inactive' | 'offline';

export interface SimulatedSensor {
  sensorId: string;
  assetId: string;
  type: MedicalSensorType;
  batteryLevel: number;
  status: SensorStatus;
}