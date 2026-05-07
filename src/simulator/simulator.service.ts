import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { SensorsService } from '../sensors/sensors.service';
import { CreateSensorReadingDto } from '../sensors/dto/create-sensor-reading.dto';

@Injectable()
export class SimulatorService implements OnModuleInit {
  private readonly logger = new Logger(SimulatorService.name);
  private intervalIds: NodeJS.Timeout[] = [];

  private readonly NUM_SENSORS = 3;
  private readonly EMIT_INTERVAL_MS = 5000;

  constructor(private readonly sensorsService: SensorsService) {}

  onModuleInit() {
    this.logger.log(`Iniciando simulación con ${this.NUM_SENSORS} sensores...`);
    for (let i = 0; i < this.NUM_SENSORS; i++) {
      const sensorId = `sensor-sim-${i + 1}`;
      const intervalId = setInterval(() => {
        this.generateAndSendReading(sensorId);
      }, this.EMIT_INTERVAL_MS);
      this.intervalIds.push(intervalId);
    }
  }

  private generateAndSendReading(sensorId: string): void {
    const reading: CreateSensorReadingDto = {
      sensorId,
      location: `Zona ${sensorId.split('-').pop()}`,
      temperature: +(20 + Math.random() * 15).toFixed(2),
      humidity: +(30 + Math.random() * 40).toFixed(2),
      gasLevel: +(100 + Math.random() * 400).toFixed(2),
      batteryLevel: +(50 + Math.random() * 50).toFixed(2),
      latitude: +(-33.4 + Math.random() * 0.4).toFixed(6),
      longitude: +(-70.6 + Math.random() * 0.4).toFixed(6),
    };

    this.sensorsService.create(reading)
      .then(() => this.logger.debug(`Lectura guardada para ${sensorId}`))
      .catch(err => this.logger.error(`Error guardando lectura de ${sensorId}: ${err.message}`));
  }
}