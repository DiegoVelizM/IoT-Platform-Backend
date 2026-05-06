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
    location: string;
    temperature: number;
    humidity: number;
    gasLevel: number;
    batteryLevel: number;
    latitude: number;
    longitude: number;
}

export interface AlertGeneratedEvent extends BaseEventPayload {
    eventType: EventType.ALERT_GENERATED;
    sensorId: string;
    alertType: EventType.LOW_BATTERY | EventType.OUT_OF_RANGE | EventType.SENSOR_OFFLINE;
    severity: 'warning' | 'critical';
    message: string;
}