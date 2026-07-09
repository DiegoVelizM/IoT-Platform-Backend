import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AlertsService } from './alerts.service';
import { Alert } from './schemas/alert.schema';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { AnalyticsEventsService } from '../analytics/analytics-events.service';
import { IncidentsEventsService } from '../incidents/incidents-events.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';

describe('AlertsService', () => {
  let service: AlertsService;
  let findMock: jest.Mock;
  let findOneMock: jest.Mock;
  let countDocumentsMock: jest.Mock;
  let incidentsEventsService: { publishAlert: jest.Mock; publishResolved: jest.Mock };
  let alertModel: jest.Mock & {
    find: jest.Mock;
    findOne: jest.Mock;
    countDocuments: jest.Mock;
  };

  beforeEach(async () => {
    findMock = jest.fn();
    findOneMock = jest.fn();
    countDocumentsMock = jest.fn();

    alertModel = Object.assign(jest.fn().mockImplementation((dto) => {
      const saved = {
        ...dto,
        _id: 'alert-id',
        toObject: () => ({ ...dto, _id: 'alert-id' }),
      };

      saved.save = jest.fn().mockResolvedValue(saved);

      return saved;
    }), {
      find: findMock,
      findOne: findOneMock,
      countDocuments: countDocumentsMock,
    });

    incidentsEventsService = {
      publishAlert: jest.fn(),
      publishResolved: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: getModelToken(Alert.name), useValue: alertModel },
        {
          provide: KafkaProducerService,
          useValue: { emit: jest.fn().mockResolvedValue({ success: true }) },
        },
        {
          provide: AnalyticsEventsService,
          useValue: { publishAlert: jest.fn() },
        },
        {
          provide: IncidentsEventsService,
          useValue: incidentsEventsService,
        },
        {
          provide: NotificationsService,
          useValue: {
            sendNotification: jest.fn().mockResolvedValue({ success: true }),
            isIntegrationEnabled: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
  });

  describe('create', () => {
    it('skips duplicate open alerts for the same sensor and type', async () => {
      const existing = {
        sensorId: 'OXI-001',
        type: 'low_battery',
        resolved: false,
        toObject: () => ({
          sensorId: 'OXI-001',
          type: 'low_battery',
          resolved: false,
        }),
      };

      findOneMock.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      const result = await service.create({
        sensorId: 'OXI-001',
        type: 'low_battery',
        severity: 'warning',
        message: 'Battery low',
        resolved: false,
      });

      expect(result).toEqual(existing.toObject());
      expect(alertModel).not.toHaveBeenCalled();
      expect(incidentsEventsService.publishAlert).not.toHaveBeenCalled();
    });

    it('does not call notifications when integration is disabled', async () => {
      const notificationsService = {
        sendNotification: jest.fn().mockResolvedValue({ success: true }),
        isIntegrationEnabled: jest.fn().mockReturnValue(false),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AlertsService,
          { provide: getModelToken(Alert.name), useValue: alertModel },
          {
            provide: KafkaProducerService,
            useValue: { emit: jest.fn().mockResolvedValue({ success: true }) },
          },
          {
            provide: AnalyticsEventsService,
            useValue: { publishAlert: jest.fn() },
          },
          {
            provide: IncidentsEventsService,
            useValue: incidentsEventsService,
          },
          { provide: NotificationsService, useValue: notificationsService },
        ],
      }).compile();

      const alertsService = module.get<AlertsService>(AlertsService);

      findOneMock.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await alertsService.create({
        sensorId: 'OXI-001',
        type: 'low_battery',
        severity: 'warning',
        message: 'Battery low',
        resolved: false,
      });

      expect(notificationsService.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('resolveOpenAlert', () => {
    it('marks alert resolved and notifies P11', async () => {
      const saveMock = jest.fn().mockResolvedValue(undefined);
      const alert = {
        sensorId: 'OXI-001',
        type: 'sensor_offline',
        severity: 'critical',
        resolved: false,
        save: saveMock,
      };

      findOneMock.mockReturnValue({
        exec: jest.fn().mockResolvedValue(alert),
      });

      await service.resolveOpenAlert('OXI-001', 'sensor_offline');

      expect(alert.resolved).toBe(true);
      expect(saveMock).toHaveBeenCalled();
      expect(incidentsEventsService.publishResolved).toHaveBeenCalledWith(
        'OXI-001',
        'sensor_offline',
        'critical',
      );
    });

    it('does nothing when there is no open alert', async () => {
      findOneMock.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await service.resolveOpenAlert('OXI-001', 'sensor_offline');

      expect(incidentsEventsService.publishResolved).not.toHaveBeenCalled();
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
