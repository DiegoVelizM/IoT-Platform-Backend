import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { SensorsService } from '../sensors/sensors.service';
import { CreateSensorReadingDto } from 'src/sensors/dto/create-sensor-reading.dto';
import {
  SimulatedSensor,
  SensorType,
} from './interfaces/simulated-sensor.interface';
import { StartSimulationDto } from './dto/start-simulation.dto';

@Injectable()
export class SimulationService implements OnModuleDestroy {
  private readonly logger = new Logger(SimulationService.name);
  private intervalIds: NodeJS.Timeout[] = [];

  private readonly NUM_SENSORS = 3;
  private readonly EMIT_INTERVAL_MS = 5000;

  constructor(private readonly sensorsService: SensorsService) {}

  private readonly locations = [
    { name: 'Sector A', latitude: -29.9533, longitude: -71.3436 },
    { name: 'Sector B', latitude: -29.9642, longitude: -71.3381 },
    { name: 'Sector C', latitude: -29.9488, longitude: -71.3602 },
  ];

  private readonly sensorTypes: SensorType[] = [
    'temperature',
    'humidity',
    'gas',
    'gps',
    'multi',
  ];

  generateSensors(quantity = 5): SimulatedSensor[] {
    const sensors: SimulatedSensor[] = [];

    for (let i = 1; i <= quantity; i++) {
      const location = this.getRandomLocation();
      const type = this.getRandomSensorType();

      sensors.push({
        sensorId: `SENSOR-${String(i).padStart(3, '0')}`,
        type,
        location: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        batteryLevel: this.getRandomBatteryLevel(),
        status: 'active',
      });
    }

    return sensors;
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

  onModuleDestroy() {
    this.stopSimulation();
  }

  private buildDefaultSensorConfigs(config?: StartSimulationDto) {
    const quantity = config?.quantity ?? this.NUM_SENSORS;
    const frequencyMs = config?.frequencyMs ?? this.EMIT_INTERVAL_MS;

    return Array.from({ length: quantity }, (_, index) => ({
      sensorId: `sensor-sim-${index + 1}`,
      frequencyMs,
    }));
  }

  private async generateAndSendReading(sensorId: string): Promise<void> {
    const location = this.getRandomLocation();

    const reading: CreateSensorReadingDto = {
      sensorId,
      location: location.name,
      temperature: +(20 + Math.random() * 40).toFixed(2),
      humidity: +(30 + Math.random() * 50).toFixed(2),
      gasLevel: +(20 + Math.random() * 90).toFixed(2),
      batteryLevel: +(5 + Math.random() * 95).toFixed(2),
      latitude: location.latitude,
      longitude: location.longitude,
    };

    try {
      await this.sensorsService.create(reading);
      this.logger.debug(`Lectura simulada guardada para ${sensorId}`);
    } catch (error) {
      this.logger.error(`Error guardando lectura simulada: ${error}`);
    }
  }

  private getRandomLocation() {
    const index = Math.floor(Math.random() * this.locations.length);
    return this.locations[index];
  }

  private getRandomSensorType(): SensorType {
    const index = Math.floor(Math.random() * this.sensorTypes.length);
    return this.sensorTypes[index];
  }

  private getRandomBatteryLevel(): number {
    return Math.floor(Math.random() * 101);
  }
}
