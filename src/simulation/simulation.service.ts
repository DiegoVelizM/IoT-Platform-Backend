import { Injectable, Logger } from '@nestjs/common';
import { SensorsService } from '../sensors/sensors.service';
import {
  ConnectionStatus,
  CreateSensorReadingDto,
  MedicalSensorType,
} from 'src/sensors/dto/create-sensor-reading.dto';
import { SimulatedSensor } from './interfaces/simulated-sensor.interface';
import { StartSimulationDto } from './dto/start-simulation.dto';
import { SENSOR_THRESHOLDS } from '../sensors/constants/sensor-thresholds.constants';

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);
  private intervalIds: NodeJS.Timeout[] = [];

  private readonly EMIT_INTERVAL_MS = 5000;
  private readonly DEFAULT_OFFLINE_PROBABILITY = 0.05;
  private readonly MAX_OFFLINE_PROBABILITY = 0.25;
  private readonly offlineProbability = this.resolveOfflineProbability();

  constructor(private readonly sensorsService: SensorsService) {}

  generateSensors(quantity = 4): SimulatedSensor[] {
    const defaultSensors = this.getDefaultMedicalSensors();

    return defaultSensors.slice(0, quantity);
  }

  startSimulation(config?: StartSimulationDto) {
    if (this.intervalIds.length > 0) {
      return { message: 'La simulación ya está en ejecución' };
    }

    const sensorConfigs =
      config?.sensors && config.sensors.length > 0
        ? config.sensors
        : this.buildDefaultSensorConfigs(config);

    sensorConfigs.forEach((sensorConfig) => {
      const intervalId = setInterval(() => {
        void this.generateAndSendReading(sensorConfig.sensorId);
      }, sensorConfig.frequencyMs);

      this.intervalIds.push(intervalId);

      this.logger.log(
        `Simulación iniciada para ${sensorConfig.sensorId} cada ${sensorConfig.frequencyMs} ms`,
      );
    });

    return {
      message: 'Simulación iniciada correctamente',
      sensors: sensorConfigs,
    };
  }

  stopSimulation() {
    this.intervalIds.forEach((interval) => clearInterval(interval));
    this.intervalIds = [];

    return { message: 'Simulación detenida correctamente' };
  }

  private buildDefaultSensorConfigs(config?: StartSimulationDto) {
    const frequencyMs = config?.frequencyMs ?? this.EMIT_INTERVAL_MS;

    return this.getDefaultMedicalSensors().map((sensor) => ({
      sensorId: sensor.sensorId,
      frequencyMs,
    }));
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
      this.logger.error(`Error guardando lectura médica simulada para ${sensorId}`, error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private getDefaultMedicalSensors(): SimulatedSensor[] {
    return [
      {
        sensorId: 'THERMO-001',
        assetId: 'MEDKIT-001',
        type: MedicalSensorType.THERMOMETER,
        batteryLevel: this.getRandomBatteryLevel(),
        status: 'active',
      },
      {
        sensorId: 'GLUCO-001',
        assetId: 'PATIENT-001',
        type: MedicalSensorType.GLUCOMETER,
        batteryLevel: this.getRandomBatteryLevel(),
        status: 'active',
      },
      {
        sensorId: 'OXI-001',
        assetId: 'PATIENT-001',
        type: MedicalSensorType.PULSE_OXIMETER,
        batteryLevel: this.getRandomBatteryLevel(),
        status: 'active',
      },
      {
        sensorId: 'BP-001',
        assetId: 'PATIENT-001',
        type: MedicalSensorType.SPHYGMOMANOMETER,
        batteryLevel: this.getRandomBatteryLevel(),
        status: 'active',
      },
    ];
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
}