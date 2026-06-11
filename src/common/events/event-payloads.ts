import { EventType } from './event-types';

export interface BaseEventPayload {
  eventId: string;
  eventType: EventType;
  occurredAt: Date;
  source: 'iot-platform';
}

export interface TelemetryReceivedEvent extends BaseEventPayload {
  eventType: EventType.TELEMETRY_RECEIVED;

  sensorId: string;
  assetId: string;
  sensorType: string;

  batteryLevel: number;
  connectionStatus: string;

  temperature?: number;

  glucoseLevel?: number;

  oxygenSaturation?: number;
  heartRate?: number;

  systolicPressure?: number;
  diastolicPressure?: number;
}

export interface AlertGeneratedEvent extends BaseEventPayload {
  eventType: EventType.ALERT_GENERATED;
  sensorId: string;
  alertType:
  | EventType.LOW_BATTERY
  | EventType.SENSOR_OFFLINE
  | EventType.TEMPERATURE_OUT_OF_RANGE
  | EventType.GLUCOSE_OUT_OF_RANGE
  | EventType.OXYGEN_SATURATION_LOW
  | EventType.HEART_RATE_OUT_OF_RANGE
  | EventType.BLOOD_PRESSURE_HIGH;
  severity: 'warning' | 'critical';
  message: string;
}