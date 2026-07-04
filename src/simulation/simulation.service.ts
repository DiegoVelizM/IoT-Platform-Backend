import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SensorsService } from '../sensors/sensors.service';
import {
  ConnectionStatus,
  CreateSensorReadingDto,
  MedicalSensorType,
} from 'src/sensors/dto/create-sensor-reading.dto';
import { SimulatedSensor } from './interfaces/simulated-sensor.interface';
import { StartSimulationDto } from './dto/start-simulation.dto';
import { SENSOR_THRESHOLDS } from '../sensors/constants/sensor-thresholds.constants';

interface SensorSchedule {
  sensorId: string;
  frequencyMs: number;
  staggerOffsetMs: number;
}

@Injectable()
export class SimulationService implements OnModuleInit {
  private readonly logger = new Logger(SimulationService.name);
  private readonly timeoutIds: NodeJS.Timeout[] = [];
  private readonly intervalIds: NodeJS.Timeout[] = [];

  private readonly EMIT_INTERVAL_MS = 5000;
  private readonly AUTO_START_FREQUENCY_MS = 10_000;
  private readonly AUTO_START_SENSOR_COUNT = 4;
  private readonly MAX_AUTO_START_SENSOR_COUNT = 50;
  private readonly MAX_MANUAL_SENSOR_COUNT = 1000;
  private readonly DEFAULT_OFFLINE_PROBABILITY = 0.02;
  private readonly MAX_OFFLINE_PROBABILITY = 0.25;
  private readonly offlineProbability = this.resolveOfflineProbability();

  constructor(private readonly sensorsService: SensorsService) {}

  onModuleInit(): void {
    if (process.env.SIMULATION_AUTO_START !== 'true') {
      return;
    }

    const quantity = this.resolveAutoStartSensorCount();
    const frequencyMs = this.resolveAutoStartFrequencyMs();

    this.logger.log(
      `Auto-start habilitado: ${quantity} sensores cada ${frequencyMs} ms (con arranque escalonado)`,
    );

    this.startSimulation({ quantity, frequencyMs });
  }

  generateSensors(quantity = 4): SimulatedSensor[] {
    const safeQuantity = this.clampQuantity(quantity, this.MAX_MANUAL_SENSOR_COUNT);

    return Array.from({ length: safeQuantity }, (_, index) =>
      this.buildSimulatedSensor(index),
    );
  }

  startSimulation(config?: StartSimulationDto) {
    if (this.isRunning()) {
      return { message: 'La simulación ya está en ejecución' };
    }

    const sensorSchedules = this.buildSensorSchedules(config);

    sensorSchedules.forEach((schedule) => {
      const timeoutId = setTimeout(() => {
        const intervalId = setInterval(() => {
          void this.generateAndSendReading(schedule.sensorId);
        }, schedule.frequencyMs);

        this.intervalIds.push(intervalId);

        this.logger.log(
          `Simulación activa para ${schedule.sensorId} cada ${schedule.frequencyMs} ms`,
        );
      }, schedule.staggerOffsetMs);

      this.timeoutIds.push(timeoutId);

      if (schedule.staggerOffsetMs > 0) {
        this.logger.log(
          `Simulación programada para ${schedule.sensorId} en ${schedule.staggerOffsetMs} ms`,
        );
      }
    });

    return {
      message: 'Simulación iniciada correctamente',
      sensors: sensorSchedules.map(({ sensorId, frequencyMs, staggerOffsetMs }) => ({
        sensorId,
        frequencyMs,
        staggerOffsetMs,
      })),
    };
  }

  stopSimulation() {
    this.timeoutIds.forEach((timeout) => clearTimeout(timeout));
    this.intervalIds.forEach((interval) => clearInterval(interval));
    this.timeoutIds.length = 0;
    this.intervalIds.length = 0;

    return { message: 'Simulación detenida correctamente' };
  }

  private isRunning(): boolean {
    return this.timeoutIds.length > 0 || this.intervalIds.length > 0;
  }

  private buildSensorSchedules(config?: StartSimulationDto): SensorSchedule[] {
    if (config?.sensors && config.sensors.length > 0) {
      const staggerMs = this.resolveStaggerMs(
        config.sensors.length,
        config.frequencyMs ?? this.EMIT_INTERVAL_MS,
      );

      return config.sensors.map((sensorConfig, index) => ({
        sensorId: sensorConfig.sensorId,
        frequencyMs: sensorConfig.frequencyMs,
        staggerOffsetMs: index * staggerMs,
      }));
    }

    const quantity = this.clampQuantity(
      config?.quantity ?? this.AUTO_START_SENSOR_COUNT,
      this.MAX_MANUAL_SENSOR_COUNT,
    );
    const frequencyMs = config?.frequencyMs ?? this.EMIT_INTERVAL_MS;
    const staggerMs = this.resolveStaggerMs(quantity, frequencyMs);

    return this.generateSensors(quantity).map((sensor, index) => ({
      sensorId: sensor.sensorId,
      frequencyMs,
      staggerOffsetMs: index * staggerMs,
    }));
  }

  private buildSimulatedSensor(index: number): SimulatedSensor {
    const templates = this.getSensorTemplates();
    const template = templates[index % templates.length];
    const sequence = Math.floor(index / templates.length) + 1;

    return {
      sensorId: `${template.prefix}-${String(sequence).padStart(3, '0')}`,
      assetId: template.assetId,
      type: template.type,
      batteryLevel: this.getRandomBatteryLevel(),
      status: 'active',
    };
  }

  private getSensorTemplates() {
    return [
      {
        prefix: 'THERMO',
        type: MedicalSensorType.THERMOMETER,
        assetId: 'MEDKIT-001',
      },
      {
        prefix: 'GLUCO',
        type: MedicalSensorType.GLUCOMETER,
        assetId: 'PATIENT-001',
      },
      {
        prefix: 'OXI',
        type: MedicalSensorType.PULSE_OXIMETER,
        assetId: 'PATIENT-001',
      },
      {
        prefix: 'BP',
        type: MedicalSensorType.SPHYGMOMANOMETER,
        assetId: 'PATIENT-001',
      },
    ];
  }

  private async generateAndSendReading(sensorId: string): Promise<void> {
    const sensorType = this.getMedicalSensorTypeFromId(sensorId);
    const batteryLevel = this.getRandomBatteryLevel();
    const isOffline = this.shouldSimulateOffline(batteryLevel);

    const reading: CreateSensorReadingDto = {
      sensorId,
      assetId: this.getAssetIdFromSensor(sensorId),
      sensorType,
      batteryLevel,
      connectionStatus: isOffline
        ? ConnectionStatus.OFFLINE
        : ConnectionStatus.CONNECTED,
      ...(isOffline ? {} : this.generateMedicalValues(sensorType)),
    };

    try {
      await this.sensorsService.create(reading);
      this.logger.debug(`Lectura médica simulada guardada para ${sensorId}`);
    } catch (error) {
      this.logger.error(
        `Error guardando lectura médica simulada para ${sensorId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private getMedicalSensorTypeFromId(sensorId: string): MedicalSensorType {
    if (sensorId.includes('THERMO')) {
      return MedicalSensorType.THERMOMETER;
    }

    if (sensorId.includes('GLUCO')) {
      return MedicalSensorType.GLUCOMETER;
    }

    if (sensorId.includes('OXI')) {
      return MedicalSensorType.PULSE_OXIMETER;
    }

    if (sensorId.includes('BP')) {
      return MedicalSensorType.SPHYGMOMANOMETER;
    }

    return MedicalSensorType.PULSE_OXIMETER;
  }

  private getAssetIdFromSensor(sensorId: string): string {
    if (sensorId.includes('THERMO')) {
      return 'MEDKIT-001';
    }

    return 'PATIENT-001';
  }

  private generateMedicalValues(sensorType: MedicalSensorType) {
    switch (sensorType) {
      case MedicalSensorType.THERMOMETER:
        return {
          temperature: +(2 + Math.random() * 8).toFixed(2),
        };

      case MedicalSensorType.GLUCOMETER:
        return {
          glucoseLevel: Math.floor(70 + Math.random() * 130),
        };

      case MedicalSensorType.PULSE_OXIMETER:
        return {
          oxygenSaturation: Math.floor(90 + Math.random() * 10),
          heartRate: Math.floor(60 + Math.random() * 60),
        };

      case MedicalSensorType.SPHYGMOMANOMETER:
        return {
          systolicPressure: Math.floor(100 + Math.random() * 60),
          diastolicPressure: Math.floor(60 + Math.random() * 40),
        };

      default:
        return {};
    }
  }

  private getRandomBatteryLevel(): number {
    return Math.floor(5 + Math.random() * 96);
  }

  private shouldSimulateOffline(batteryLevel: number): boolean {
    let probability = this.offlineProbability;

    if (batteryLevel < SENSOR_THRESHOLDS.BATTERY.CRITICAL) {
      probability += 0.1;
    } else if (batteryLevel < SENSOR_THRESHOLDS.BATTERY.LOW) {
      probability += 0.05;
    }

    return Math.random() < Math.min(probability, this.MAX_OFFLINE_PROBABILITY);
  }

  private resolveOfflineProbability(): number {
    const configuredValue = Number(process.env.SIMULATION_OFFLINE_PROBABILITY);

    if (!Number.isFinite(configuredValue)) {
      return this.DEFAULT_OFFLINE_PROBABILITY;
    }

    return Math.min(Math.max(configuredValue, 0), this.MAX_OFFLINE_PROBABILITY);
  }

  private resolveAutoStartSensorCount(): number {
    const configuredValue = Number(process.env.SIMULATION_AUTO_SENSOR_COUNT);

    if (!Number.isFinite(configuredValue)) {
      return this.AUTO_START_SENSOR_COUNT;
    }

    return this.clampQuantity(
      configuredValue,
      this.MAX_AUTO_START_SENSOR_COUNT,
    );
  }

  private resolveAutoStartFrequencyMs(): number {
    const configuredValue = Number(process.env.SIMULATION_AUTO_FREQUENCY_MS);

    if (!Number.isFinite(configuredValue)) {
      return this.AUTO_START_FREQUENCY_MS;
    }

    return Math.min(Math.max(configuredValue, 1000), 60_000);
  }

  private resolveStaggerMs(sensorCount: number, frequencyMs: number): number {
    const configuredValue = Number(process.env.SIMULATION_STAGGER_MS);

    if (Number.isFinite(configuredValue) && configuredValue >= 0) {
      return configuredValue;
    }

    if (sensorCount <= 1) {
      return 0;
    }

    return Math.max(100, Math.floor(frequencyMs / sensorCount));
  }

  private clampQuantity(quantity: number, max: number): number {
    if (!Number.isFinite(quantity) || quantity < 1) {
      return 1;
    }

    return Math.min(Math.floor(quantity), max);
  }
}
