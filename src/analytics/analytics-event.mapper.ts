import { SensorReading } from '../sensors/schemas/sensor-reading.schema';
import { Alert } from '../alerts/schemas/alert.schema';
import { AnalyticsAlertContext } from './interfaces/analytics-alert-context.interface';

export interface AnalyticsEventEnvelope {
  source: string;
  event_type: string;
  payload: Record<string, unknown>;
}

const OUT_OF_RANGE_ALERT_TYPES = new Set([
  'temperature_out_of_range',
  'glucose_out_of_range',
  'oxygen_saturation_low',
  'heart_rate_out_of_range',
  'blood_pressure_high',
]);

function basePayload(
  sensorId: string,
  assetId: string,
  sensorType: string,
  timestamp?: Date,
): Record<string, unknown> {
  return {
    sensor_id: sensorId,
    asset_id: assetId,
    sensor_type: sensorType,
    timestamp: (timestamp ?? new Date()).toISOString(),
  };
}

export function mapTelemetryReceivedEvent(
  reading: SensorReading & { createdAt?: Date },
  source: string,
): AnalyticsEventEnvelope {
  const payload: Record<string, unknown> = {
    ...basePayload(
      reading.sensorId,
      reading.assetId,
      reading.sensorType,
      reading.createdAt,
    ),
  };

  if (reading.batteryLevel !== undefined) {
    payload.battery = reading.batteryLevel;
  }

  if (reading.connectionStatus !== undefined) {
    payload.connection_status = reading.connectionStatus;
  }

  if (reading.temperature !== undefined) {
    payload.temperature = reading.temperature;
  }

  if (reading.glucoseLevel !== undefined) {
    payload.glucose_level = reading.glucoseLevel;
  }

  if (reading.oxygenSaturation !== undefined) {
    payload.oxygen_saturation = reading.oxygenSaturation;
  }

  if (reading.heartRate !== undefined) {
    payload.heart_rate = reading.heartRate;
  }

  if (reading.systolicPressure !== undefined) {
    payload.systolic_pressure = reading.systolicPressure;
  }

  if (reading.diastolicPressure !== undefined) {
    payload.diastolic_pressure = reading.diastolicPressure;
  }

  return {
    source,
    event_type: 'telemetry_received',
    payload,
  };
}

export function mapAlertToAnalyticsEvent(
  alert: Alert,
  context: AnalyticsAlertContext,
  source: string,
): AnalyticsEventEnvelope | null {
  const timestamp = alert.occurredAt ?? new Date();

  if (alert.type === 'low_battery') {
    if (context.batteryLevel === undefined) {
      return null;
    }

    return {
      source,
      event_type: 'low_battery',
      payload: {
        ...basePayload(
          alert.sensorId,
          context.assetId,
          context.sensorType,
          timestamp,
        ),
        battery: context.batteryLevel,
      },
    };
  }

  if (alert.type === 'sensor_offline') {
    return {
      source,
      event_type: 'sensor_offline',
      payload: {
        ...basePayload(
          alert.sensorId,
          context.assetId,
          context.sensorType,
          timestamp,
        ),
        connection_status: context.connectionStatus ?? 'offline',
      },
    };
  }

  if (OUT_OF_RANGE_ALERT_TYPES.has(alert.type)) {
    if (context.currentValue === undefined) {
      return null;
    }

    return {
      source,
      event_type: 'out_of_range',
      payload: {
        ...basePayload(
          alert.sensorId,
          context.assetId,
          context.sensorType,
          timestamp,
        ),
        current_value: context.currentValue,
        alert_type: alert.type,
        severity: alert.severity,
      },
    };
  }

  return null;
}
