export enum EventType {
  TELEMETRY_RECEIVED = 'telemetry_received',

  ALERT_GENERATED = 'alert_generated',

  ALERT_RESOLVED = 'alert_resolved',

  SENSOR_OFFLINE = 'sensor_offline',

  LOW_BATTERY = 'low_battery',

  TEMPERATURE_OUT_OF_RANGE = 'temperature_out_of_range',

  GLUCOSE_OUT_OF_RANGE = 'glucose_out_of_range',

  OXYGEN_SATURATION_LOW = 'oxygen_saturation_low',

  HEART_RATE_OUT_OF_RANGE = 'heart_rate_out_of_range',

  BLOOD_PRESSURE_HIGH = 'blood_pressure_high',
}