import { EventType } from './event-types';
import { TelemetryReceivedEvent } from './event-payloads';

const testEvent: TelemetryReceivedEvent = {
  eventId: 'evt-001',
  eventType: EventType.TELEMETRY_RECEIVED,
  occurredAt: new Date(),
  source: 'iot-platform',

  sensorId: 'ESP32-001',
  location: 'Sector A',
  temperature: 28.5,
  humidity: 60,
  gasLevel: 35,
  batteryLevel: 87,
  latitude: -29.9533,
  longitude: -71.3436,
};

console.log(testEvent);
