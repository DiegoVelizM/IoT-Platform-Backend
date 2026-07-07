import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SensorsService } from './sensors.service';
import { SensorReading } from './schemas/sensor-reading.schema';
import { AlertsService } from '../alerts/alerts.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { AnalyticsEventsService } from '../analytics/analytics-events.service';
import { KAFKA_TOPICS } from '../kafka/kafka-topics.constants';
import {
  ConnectionStatus,
  CreateSensorReadingDto,
  MedicalSensorType,
} from './dto/create-sensor-reading.dto';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';

describe('SensorsService', () => {
  let service: SensorsService;
  let alertsService: { create: jest.Mock };
  let kafkaProducer: { emit: jest.Mock };
  let analyticsEventsService: { publishTelemetry: jest.Mock };
  let modelMock: jest.Mock & {
    find: jest.Mock;
    countDocuments: jest.Mock;
  };
  let findMock: jest.Mock;
  let countDocumentsMock: jest.Mock;

  const baseReading: CreateSensorReadingDto = {
    sensorId: 'OXI-001',
    assetId: 'PATIENT-001',
    sensorType: MedicalSensorType.PULSE_OXIMETER,
    batteryLevel: 85,
    connectionStatus: ConnectionStatus.CONNECTED,
    oxygenSaturation: 98,
    heartRate: 72,
  };

  beforeEach(async () => {
    modelMock = jest.fn().mockImplementation((reading) => {
      const saved = {
        ...reading,
        toObject: () => ({ ...reading }),
      };

      return {
        ...saved,
        save: jest.fn().mockResolvedValue(saved),
      };
    });

    findMock = jest.fn();
    countDocumentsMock = jest.fn();

    alertsService = { create: jest.fn().mockResolvedValue({}) };
    kafkaProducer = { emit: jest.fn().mockResolvedValue({ success: true }) };
    analyticsEventsService = { publishTelemetry: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensorsService,
        { provide: getModelToken(SensorReading.name), useValue: modelMock },
        { provide: AlertsService, useValue: alertsService },
        { provide: KafkaProducerService, useValue: kafkaProducer },
        { provide: AnalyticsEventsService, useValue: analyticsEventsService },
      ],
    }).compile();

    service = module.get<SensorsService>(SensorsService);

    Object.assign(modelMock, { find: findMock, countDocuments: countDocumentsMock });
  });

  describe('create', () => {
    it('persists reading, publishes telemetry and skips battery alert when level is healthy', async () => {
      await service.create(baseReading);

      expect(modelMock).toHaveBeenCalled();
      expect(kafkaProducer.emit).toHaveBeenCalledWith(
        KAFKA_TOPICS.TELEMETRY_RECEIVED,
        expect.objectContaining({ sensorId: 'OXI-001' }),
      );
      expect(analyticsEventsService.publishTelemetry).toHaveBeenCalled();
      expect(alertsService.create).not.toHaveBeenCalled();
    });

    it('creates warning alert when battery is below LOW threshold', async () => {
      await service.create({ ...baseReading, batteryLevel: 15 });

      expect(alertsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'low_battery',
          severity: 'warning',
          sensorId: 'OXI-001',
        }),
        expect.any(Object),
      );
    });

    it('creates critical alert when battery is below CRITICAL threshold', async () => {
      await service.create({ ...baseReading, batteryLevel: 5 });

      expect(alertsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'low_battery',
          severity: 'critical',
        }),
        expect.any(Object),
      );
    });

    it('creates sensor_offline critical alert and publishes offline event', async () => {
      await service.create({
        ...baseReading,
        connectionStatus: ConnectionStatus.OFFLINE,
      });

      expect(alertsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sensor_offline',
          severity: 'critical',
        }),
        expect.any(Object),
      );
      expect(kafkaProducer.emit).toHaveBeenCalledWith(
        KAFKA_TOPICS.SENSOR_OFFLINE,
        expect.objectContaining({
          sensorId: 'OXI-001',
          connectionStatus: ConnectionStatus.OFFLINE,
        }),
      );
    });

    it('creates glucose critical alert when value exceeds CRITICAL_HIGH', async () => {
      await service.create({
        sensorId: 'GLUCO-001',
        assetId: 'PATIENT-001',
        sensorType: MedicalSensorType.GLUCOMETER,
        glucoseLevel: 260,
      });

      expect(alertsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'glucose_out_of_range',
          severity: 'critical',
        }),
        expect.any(Object),
      );
    });
  });

  describe('findAll', () => {
    it('returns paginated readings with total count', async () => {
      const readings = [{ sensorId: 'OXI-001' }];
      const execMock = jest.fn().mockResolvedValue(readings);
      const leanMock = jest.fn().mockReturnValue({ exec: execMock });
      const limitMock = jest.fn().mockReturnValue({ lean: leanMock });
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
      findMock.mockReturnValue({ sort: sortMock });
      countDocumentsMock.mockReturnValue({
        exec: jest.fn().mockResolvedValue(42),
      });

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(skipMock).toHaveBeenCalledWith(10);
      expect(limitMock).toHaveBeenCalledWith(10);
      expect(result).toEqual({
        data: readings,
        page: 2,
        limit: 10,
        total: 42,
      });
    });
  });

  describe('findBySensor', () => {
    it('throws NOT_FOUND when sensor has no readings', async () => {
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
