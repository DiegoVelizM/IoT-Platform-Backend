import {
  ConnectionStatus,
  CreateSensorReadingDto,
  MedicalSensorType,
} from '../sensors/dto/create-sensor-reading.dto';

export type DemoScenarioCategory = 'alert' | 'recovery';

export interface DemoScenarioIntegrations {
  kafka: string[];
  p09: string;
  p11: string;
  p06: string;
}

export interface DemoScenarioExpectedAlert {
  type: string;
  severity: 'warning' | 'critical';
  action: 'create' | 'resolve' | 'dedup_if_open';
}

export interface DemoScenarioDefinition {
  id: string;
  title: string;
  description: string;
  category: DemoScenarioCategory;
  expectedAlert: DemoScenarioExpectedAlert;
  integrations: DemoScenarioIntegrations;
  reading: CreateSensorReadingDto;
}

const DEFAULT_INTEGRATIONS_ALERT: DemoScenarioIntegrations = {
  kafka: ['telemetry_received', 'alert_generated'],
  p09: 'Evento de telemetría y alerta (si se crea alerta nueva)',
  p11: 'alert_generated (warning/critical)',
  p06: 'Email solo si la alerta es nueva (dedup si ya estaba abierta)',
};

const DEFAULT_INTEGRATIONS_RECOVERY: DemoScenarioIntegrations = {
  kafka: ['telemetry_received'],
  p09: 'Evento de telemetría',
  p11: 'alert_resolved si existía alerta abierta del mismo tipo',
  p06: 'Sin notificación en resolución',
};

export const DEMO_SCENARIOS: DemoScenarioDefinition[] = [
  {
    id: 'low-battery-warning',
    title: 'Batería baja (warning)',
    description:
      'Dispara alerta low_battery con severidad warning. Útil para demostrar P11 y P06 sin saturar incidentes críticos.',
    category: 'alert',
    expectedAlert: {
      type: 'low_battery',
      severity: 'warning',
      action: 'create',
    },
    integrations: DEFAULT_INTEGRATIONS_ALERT,
    reading: {
      sensorId: 'OXI-001',
      assetId: 'PATIENT-001',
      sensorType: MedicalSensorType.PULSE_OXIMETER,
      batteryLevel: 15,
      connectionStatus: ConnectionStatus.CONNECTED,
      oxygenSaturation: 96,
      heartRate: 78,
    },
  },
  {
    id: 'low-battery-critical',
    title: 'Batería crítica',
    description: 'Dispara alerta low_battery con severidad critical.',
    category: 'alert',
    expectedAlert: {
      type: 'low_battery',
      severity: 'critical',
      action: 'create',
    },
    integrations: DEFAULT_INTEGRATIONS_ALERT,
    reading: {
      sensorId: 'GLUCO-001',
      assetId: 'PATIENT-001',
      sensorType: MedicalSensorType.GLUCOMETER,
      batteryLevel: 8,
      connectionStatus: ConnectionStatus.CONNECTED,
      glucoseLevel: 110,
    },
  },
  {
    id: 'sensor-offline',
    title: 'Sensor offline',
    description:
      'Marca el sensor como offline. Dispara alerta critical y evento sensor_offline en Kafka.',
    category: 'alert',
    expectedAlert: {
      type: 'sensor_offline',
      severity: 'critical',
      action: 'create',
    },
    integrations: {
      ...DEFAULT_INTEGRATIONS_ALERT,
      kafka: ['telemetry_received', 'alert_generated', 'sensor_offline'],
    },
    reading: {
      sensorId: 'THERMO-001',
      assetId: 'MEDKIT-001',
      sensorType: MedicalSensorType.THERMOMETER,
      batteryLevel: 70,
      connectionStatus: ConnectionStatus.OFFLINE,
    },
  },
  {
    id: 'temperature-out-of-range',
    title: 'Temperatura fuera de cadena de frío',
    description: 'Temperatura de insumo médico fuera del rango 2°C–8°C.',
    category: 'alert',
    expectedAlert: {
      type: 'temperature_out_of_range',
      severity: 'warning',
      action: 'create',
    },
    integrations: DEFAULT_INTEGRATIONS_ALERT,
    reading: {
      sensorId: 'THERMO-001',
      assetId: 'MEDKIT-001',
      sensorType: MedicalSensorType.THERMOMETER,
      batteryLevel: 88,
      connectionStatus: ConnectionStatus.CONNECTED,
      temperature: 10.5,
    },
  },
  {
    id: 'glucose-high',
    title: 'Glucosa elevada',
    description: 'Glucosa por encima del umbral HIGH (warning).',
    category: 'alert',
    expectedAlert: {
      type: 'glucose_out_of_range',
      severity: 'warning',
      action: 'create',
    },
    integrations: DEFAULT_INTEGRATIONS_ALERT,
    reading: {
      sensorId: 'GLUCO-001',
      assetId: 'PATIENT-001',
      sensorType: MedicalSensorType.GLUCOMETER,
      batteryLevel: 82,
      connectionStatus: ConnectionStatus.CONNECTED,
      glucoseLevel: 195,
    },
  },
  {
    id: 'oxygen-low',
    title: 'Saturación de oxígeno baja',
    description: 'SpO₂ por debajo del umbral LOW (warning).',
    category: 'alert',
    expectedAlert: {
      type: 'oxygen_saturation_low',
      severity: 'warning',
      action: 'create',
    },
    integrations: DEFAULT_INTEGRATIONS_ALERT,
    reading: {
      sensorId: 'OXI-001',
      assetId: 'PATIENT-001',
      sensorType: MedicalSensorType.PULSE_OXIMETER,
      batteryLevel: 85,
      connectionStatus: ConnectionStatus.CONNECTED,
      oxygenSaturation: 89,
      heartRate: 78,
    },
  },
  {
    id: 'blood-pressure-high',
    title: 'Presión arterial elevada',
    description: 'Presión sistólica/diastólica por encima de umbrales HIGH.',
    category: 'alert',
    expectedAlert: {
      type: 'blood_pressure_high',
      severity: 'warning',
      action: 'create',
    },
    integrations: DEFAULT_INTEGRATIONS_ALERT,
    reading: {
      sensorId: 'BP-001',
      assetId: 'PATIENT-001',
      sensorType: MedicalSensorType.SPHYGMOMANOMETER,
      batteryLevel: 76,
      connectionStatus: ConnectionStatus.CONNECTED,
      systolicPressure: 155,
      diastolicPressure: 98,
    },
  },
  {
    id: 'recovery-normal-reading',
    title: 'Recuperación — lectura normal',
    description:
      'Envía valores normales para resolver alertas abiertas del sensor (low_battery, offline, umbrales médicos). Demuestra alert_resolved hacia P11.',
    category: 'recovery',
    expectedAlert: {
      type: 'varias (según alertas abiertas)',
      severity: 'warning',
      action: 'resolve',
    },
    integrations: DEFAULT_INTEGRATIONS_RECOVERY,
    reading: {
      sensorId: 'OXI-001',
      assetId: 'PATIENT-001',
      sensorType: MedicalSensorType.PULSE_OXIMETER,
      batteryLevel: 92,
      connectionStatus: ConnectionStatus.CONNECTED,
      oxygenSaturation: 97,
      heartRate: 72,
    },
  },
];

export function findDemoScenarioById(
  scenarioId: string,
): DemoScenarioDefinition | undefined {
  return DEMO_SCENARIOS.find((scenario) => scenario.id === scenarioId);
}

export function buildScenarioReading(
  scenario: DemoScenarioDefinition,
  overrides?: { sensorId?: string; assetId?: string },
): CreateSensorReadingDto {
  return {
    ...scenario.reading,
    ...(overrides?.sensorId ? { sensorId: overrides.sensorId } : {}),
    ...(overrides?.assetId ? { assetId: overrides.assetId } : {}),
  };
}
