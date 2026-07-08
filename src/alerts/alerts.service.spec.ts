import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AlertsService } from './alerts.service';
import { Alert } from './schemas/alert.schema';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { AnalyticsEventsService } from '../analytics/analytics-events.service';
import { IncidentsEventsService } from '../incidents/incidents-events.service';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';

describe('AlertsService', () => {
  let service: AlertsService;
  let findMock: jest.Mock;
  let findOneMock: jest.Mock;
  let countDocumentsMock: jest.Mock;
  let kafkaEmitMock: jest.Mock;

  beforeEach(async () => {
    findMock = jest.fn();
    findOneMock = jest.fn();
    countDocumentsMock = jest.fn();
    kafkaEmitMock = jest.fn().mockResolvedValue({ success: true });

    const alertModel = Object.assign(jest.fn(), {
      find: findMock,
      findOne: findOneMock,
      countDocuments: countDocumentsMock,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: getModelToken(Alert.name), useValue: alertModel },
        {
          provide: KafkaProducerService,
          useValue: { emit: kafkaEmitMock },
        },
        {
          provide: AnalyticsEventsService,
          useValue: { publishAlert: jest.fn() },
        },
        {
          provide: IncidentsEventsService,
          useValue: { publishAlert: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
  });

  describe('create', () => {
    it('skips creation when an active alert of the same type already exists', async () => {
      const existingAlert = {
        sensorId: 'OXI-001',
        type: 'low_battery',
        severity: 'warning',
        resolved: false,
        toObject: () => ({
          sensorId: 'OXI-001',
          type: 'low_battery',
          severity: 'warning',
          resolved: false,
        }),
      };

      findOneMock.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingAlert),
      });

      const result = await service.create({
        sensorId: 'OXI-001',
        type: 'low_battery',
        severity: 'warning',
        message: 'Battery level is low: 15%',
        resolved: false,
      });

      expect(result).toEqual(existingAlert.toObject());
      expect(kafkaEmitMock).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns paginated alerts with total count', async () => {
      const alerts = [{ sensorId: 'OXI-001', type: 'low_battery' }];
      const execMock = jest.fn().mockResolvedValue(alerts);
      const leanMock = jest.fn().mockReturnValue({ exec: execMock });
      const limitMock = jest.fn().mockReturnValue({ lean: leanMock });
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
      findMock.mockReturnValue({ sort: sortMock });
      countDocumentsMock.mockReturnValue({
        exec: jest.fn().mockResolvedValue(3),
      });

      const result = await service.findAll({ page: 1, limit: 25 });

      expect(result).toEqual({
        data: alerts,
        page: 1,
        limit: 25,
        total: 3,
      });
    });
  });

  describe('findBySensor', () => {
    it('throws NOT_FOUND when sensor has no alerts', async () => {
      const execMock = jest.fn().mockResolvedValue([]);
      const leanMock = jest.fn().mockReturnValue({ exec: execMock });
      const limitMock = jest.fn().mockReturnValue({ lean: leanMock });
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
      findMock.mockReturnValue({ sort: sortMock });
      countDocumentsMock.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await expect(
        service.findBySensor('UNKNOWN-001', { page: 1, limit: 25 }),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);
    });
  });
});
