import { EventType } from '../common/events/event-types';

export const KAFKA_TOPICS = {
  TELEMETRY_RECEIVED: EventType.TELEMETRY_RECEIVED,
  ALERT_GENERATED: EventType.ALERT_GENERATED,
	SENSOR_OFFLINE: EventType.SENSOR_OFFLINE,
} as const;