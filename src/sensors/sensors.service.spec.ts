import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SensorsService } from './sensors.service';
import { AlertsService } from '../alerts/alerts.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { SensorReading } from './schemas/sensor-reading.schema';

describe('SensorsService', () => {
  let service: SensorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensorsService,
        { provide: getModelToken(SensorReading.name), useValue: {} },
        { provide: AlertsService, useValue: {} },
        { provide: KafkaProducerService, useValue: {} },
      ],
    }).compile();

    service = module.get<SensorsService>(SensorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
