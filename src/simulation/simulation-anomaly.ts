import { MedicalSensorType } from '../sensors/dto/create-sensor-reading.dto';
import { SENSOR_THRESHOLDS } from '../sensors/constants/sensor-thresholds.constants';

export type SimulatedAnomalyProfile =
  | { kind: 'low_battery'; batteryLevel: number }
  | { kind: 'sensor_offline' }
  | {
      kind: 'medical';
      batteryLevel: number;
      values: Record<string, number>;
    };

function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function pickOne<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

export function buildAnomalyProfile(
  sensorType: MedicalSensorType,
): SimulatedAnomalyProfile {
  const roll = Math.random();

  if (roll < 0.2) {
    return { kind: 'sensor_offline' };
  }

  if (roll < 0.45) {
    const critical = Math.random() < 0.35;
    return {
      kind: 'low_battery',
      batteryLevel: critical
        ? randomInt(5, SENSOR_THRESHOLDS.BATTERY.CRITICAL - 1)
        : randomInt(
            SENSOR_THRESHOLDS.BATTERY.CRITICAL,
            SENSOR_THRESHOLDS.BATTERY.LOW - 1,
          ),
    };
  }

  return {
    kind: 'medical',
    batteryLevel: randomInt(40, 100),
    values: buildAnomalousMedicalValues(sensorType),
  };
}

export function buildAnomalousMedicalValues(
  sensorType: MedicalSensorType,
): Record<string, number> {
  switch (sensorType) {
    case MedicalSensorType.THERMOMETER:
      return pickOne([
        {
          temperature: +(0.5 + Math.random() * 1.4).toFixed(2),
        },
        {
          temperature: +(8.1 + Math.random() * 3).toFixed(2),
        },
      ]);

    case MedicalSensorType.GLUCOMETER:
      return pickOne([
        {
          glucoseLevel: randomInt(
            SENSOR_THRESHOLDS.GLUCOSE.CRITICAL_LOW + 1,
            SENSOR_THRESHOLDS.GLUCOSE.LOW - 1,
          ),
        },
        {
          glucoseLevel: randomInt(
            SENSOR_THRESHOLDS.GLUCOSE.HIGH + 1,
            SENSOR_THRESHOLDS.GLUCOSE.CRITICAL_HIGH - 1,
          ),
        },
      ]);

    case MedicalSensorType.PULSE_OXIMETER:
      return pickOne([
        {
          oxygenSaturation: randomInt(
            SENSOR_THRESHOLDS.OXYGEN_SATURATION.CRITICAL + 1,
            SENSOR_THRESHOLDS.OXYGEN_SATURATION.LOW - 1,
          ),
          heartRate: randomInt(65, 95),
        },
        {
          oxygenSaturation: randomInt(93, 98),
          heartRate: randomInt(
            SENSOR_THRESHOLDS.HEART_RATE.HIGH + 1,
            SENSOR_THRESHOLDS.HEART_RATE.CRITICAL_HIGH - 1,
          ),
        },
      ]);

    case MedicalSensorType.SPHYGMOMANOMETER:
      return {
        systolicPressure: randomInt(
          SENSOR_THRESHOLDS.BLOOD_PRESSURE.SYSTOLIC_HIGH + 1,
          SENSOR_THRESHOLDS.BLOOD_PRESSURE.SYSTOLIC_CRITICAL - 1,
        ),
        diastolicPressure: randomInt(
          SENSOR_THRESHOLDS.BLOOD_PRESSURE.DIASTOLIC_HIGH + 1,
          SENSOR_THRESHOLDS.BLOOD_PRESSURE.DIASTOLIC_CRITICAL - 1,
        ),
      };

    default:
      return {};
  }
}

export function resolveAnomalyProbability(
  envValue: string | undefined,
  defaultValue = 0,
  maxValue = 1,
): number {
  const configuredValue = Number(envValue);

  if (!Number.isFinite(configuredValue)) {
    return defaultValue;
  }

  return Math.min(Math.max(configuredValue, 0), maxValue);
}
