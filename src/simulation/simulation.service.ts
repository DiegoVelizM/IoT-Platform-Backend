import { Injectable, Logger } from '@nestjs/common';
import { SensorsService } from '../sensors/sensors.service';
import { CreateSensorReadingDto } from 'src/sensors/dto/create-sensor-reading.dto';
import {
  SimulatedSensor,
  SensorType,
} from './interfaces/simulated-sensor.interface';
import { StartSimulationDto } from './dto/start-simulation.dto';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { KAFKA_TOPICS } from '../kafka/kafka-topics.constants';

type MedicalPatient = {
  patientId: string;
  sensors: { sensor_id: string; type: string }[];
};

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);
  private intervalIds: NodeJS.Timeout[] = [];
  private medicalReadingCounter = 0;

  private readonly NUM_SENSORS = 3;
  private readonly EMIT_INTERVAL_MS = 5000;

  constructor(
    private readonly sensorsService: SensorsService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

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

  startMedicalSimulation() {
    if (this.intervalIds.length > 0) {
      return { message: 'La simulación médica ya está en ejecución' };
    }

    const patients: MedicalPatient[] = [
      {
        patientId: 'PATIENT-001',
        sensors: [
          { sensor_id: 'PATIENT-001-TEMP', type: 'temperature' },
          { sensor_id: 'PATIENT-001-GLU', type: 'glucose' },
          { sensor_id: 'PATIENT-001-HR', type: 'heart_rate' },
          { sensor_id: 'PATIENT-001-BP', type: 'blood_pressure' },
        ],
      },
      {
        patientId: 'PATIENT-002',
        sensors: [
          { sensor_id: 'PATIENT-002-TEMP', type: 'temperature' },
          { sensor_id: 'PATIENT-002-GLU', type: 'glucose' },
          { sensor_id: 'PATIENT-002-HR', type: 'heart_rate' },
          { sensor_id: 'PATIENT-002-BP', type: 'blood_pressure' },
        ],
      },
      {
        patientId: 'PATIENT-003',
        sensors: [
          { sensor_id: 'PATIENT-003-TEMP', type: 'temperature' },
          { sensor_id: 'PATIENT-003-GLU', type: 'glucose' },
          { sensor_id: 'PATIENT-003-HR', type: 'heart_rate' },
          { sensor_id: 'PATIENT-003-BP', type: 'blood_pressure' },
        ],
      },
    ];

    patients.forEach((patient) => {
      patient.sensors.forEach((s) => {
        const intervalId = setInterval(async () => {
          await this.generateMedicalReading(
            patient.patientId,
            s.sensor_id,
            s.type,
          );
        }, 5000);
        this.intervalIds.push(intervalId);
      });
    });

    return { message: 'Simulación médica iniciada', patients };
  }

  private async generateMedicalReading(
    patientId: string,
    sensorId: string,
    type: string,
  ) {
    const base: any = {
      sensor_id: sensorId,
      asset_id: patientId,
      sensor_type: type,
      timestamp: new Date().toISOString(),
      battery: Math.floor(10 + Math.random() * 90),
      signal_strength: Math.floor(20 + Math.random() * 80),
    };

    // create realistic values with occasional anomalies
    if (type === 'temperature') {
      let temp = +(36 + Math.random() * 1.5).toFixed(1);
      if (Math.random() < 0.05) temp = +(38 + Math.random() * 3).toFixed(1); // fever
      base.temperature = temp;
    }
    if (type === 'glucose') {
      let g = Math.floor(80 + Math.random() * 60);
      if (Math.random() < 0.03) g = Math.floor(200 + Math.random() * 120); // hyperglycemia
      base.glucose = g;
    }
    if (type === 'heart_rate') {
      let hr = Math.floor(60 + Math.random() * 30);
      if (Math.random() < 0.04) hr = Math.floor(40 + Math.random() * 120);
      base.heart_rate = hr;
    }
    if (type === 'blood_pressure') {
      let sys = Math.floor(110 + Math.random() * 20);
      let dia = Math.floor(70 + Math.random() * 10);
      if (Math.random() < 0.03) {
        sys = Math.floor(160 + Math.random() * 60);
        dia = Math.floor(100 + Math.random() * 40);
      }
      base.systolic = sys;
      base.diastolic = dia;
    }

    try {
      await this.sensorsService.create(base);
      this.logger.debug(`Medical reading saved for ${sensorId}`);
      this.medicalReadingCounter++;

      if (base.signal_strength < 25) {
        await this.kafkaProducer.emit(KAFKA_TOPICS.SIGNAL_LOST, {
          event_type: KAFKA_TOPICS.SIGNAL_LOST,
          asset_id: patientId,
          sensor_id: sensorId,
          signal_strength: base.signal_strength,
          timestamp: new Date(),
        });
      }

      if (this.medicalReadingCounter % 10 === 0) {
        await this.kafkaProducer.emit(KAFKA_TOPICS.SENSOR_OFFLINE, {
          event_type: KAFKA_TOPICS.SENSOR_OFFLINE,
          asset_id: patientId,
          sensor_id: sensorId,
          timestamp: new Date(),
        });
      }
    } catch (err) {
      this.logger.error('Error saving medical reading: ' + err);
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
