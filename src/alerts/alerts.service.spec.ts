import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AlertsService } from './alerts.service';
import { Alert } from './schemas/alert.schema';

class MockAlertModel {
  constructor(data: Record<string, unknown>) {
    Object.assign(this, data);
  }

  save = jest.fn();
}

describe('AlertsService', () => {
  let service: AlertsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: getModelToken(Alert.name),
          useValue: MockAlertModel,
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
