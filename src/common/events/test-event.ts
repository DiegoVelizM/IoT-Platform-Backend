import { EventType } from './event-types';
import { TelemetryReceivedEvent } from './event-payloads';

const testEvent: TelemetryReceivedEvent = {
  eventId: 'evt-001',
  eventType: EventType.TELEMETRY_RECEIVED,
  occurredAt: new Date(),
  source: 'iot-platform',

  sensorId: 'OXI-001',
  assetId: 'PATIENT-001',
  sensorType: 'pulse_oximeter',
  batteryLevel: 87,
  connectionStatus: 'connected',
  oxygenSaturation: 96,
  heartRate: 82,
};

console.log(testEvent);