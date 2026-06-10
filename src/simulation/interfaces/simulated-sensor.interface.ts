export type SensorType = 'temperature' | 'humidity' | 'gas' | 'gps' | 'multi';

export type SensorStatus = 'active' | 'inactive' | 'offline';

export interface SimulatedSensor {
  sensorId: string;
  type: SensorType;
  location: string;
  latitude: number;
  longitude: number;
  batteryLevel: number;
  status: SensorStatus;
}
