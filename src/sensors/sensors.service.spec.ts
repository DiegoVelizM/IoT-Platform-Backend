import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AlertsService } from '../alerts/alerts.service';
import { SensorReading } from './schemas/sensor-reading.schema';
import { SensorsService } from './sensors.service';

class MockSensorReadingModel {
  constructor(data: Record<string, unknown>) {
    Object.assign(this, data);
  }

  save = jest.fn();
}

describe('SensorsService', () => {
  let service: SensorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensorsService,
        {
          provide: getModelToken(SensorReading.name),
          useValue: MockSensorReadingModel,
        },
        {
          provide: AlertsService,
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<SensorsService>(SensorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
