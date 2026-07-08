import { Test, TestingModule } from '@nestjs/testing';
import { KafkaConsumerService } from './kafka-consumer.service';
import { KAFKA_TOPICS } from './kafka-topics.constants';

const mockRun = jest.fn().mockResolvedValue(undefined);
const mockSubscribe = jest.fn().mockResolvedValue(undefined);
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);

const mockConsumer = {
  connect: mockConnect,
  subscribe: mockSubscribe,
  run: mockRun,
  disconnect: mockDisconnect,
};

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    consumer: jest.fn().mockReturnValue(mockConsumer),
  })),
}));

jest.mock('./kafka.config', () => ({
  resolveKafkaConfig: jest.fn().mockReturnValue({
    mode: 'local',
    brokers: ['kafka:9092'],
    kafkaConfig: { clientId: 'test', brokers: ['kafka:9092'] },
  }),
}));

describe('KafkaConsumerService', () => {
  let service: KafkaConsumerService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
    mockSubscribe.mockResolvedValue(undefined);
    mockRun.mockResolvedValue(undefined);
    mockDisconnect.mockResolvedValue(undefined);
    delete process.env.KAFKA_CONSUMER_GROUP_ID;

    const module: TestingModule = await Test.createTestingModule({
      providers: [KafkaConsumerService],
    }).compile();

    service = module.get<KafkaConsumerService>(KafkaConsumerService);
  });

  it('connects, subscribes to topics and starts the consumer on init', async () => {
    await service.onModuleInit();

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockSubscribe).toHaveBeenCalledWith({
      topics: [
        KAFKA_TOPICS.TELEMETRY_RECEIVED,
        KAFKA_TOPICS.ALERT_GENERATED,
        KAFKA_TOPICS.SENSOR_OFFLINE,
      ],
      fromBeginning: false,
    });
    expect(mockRun).toHaveBeenCalledTimes(1);
    expect(service.getHealthStatus()).toMatchObject({
      connected: true,
      groupId: 'iot-platform-consumer',
      messagesConsumed: 0,
    });
  });

  it('uses KAFKA_CONSUMER_GROUP_ID when provided', async () => {
    process.env.KAFKA_CONSUMER_GROUP_ID = 'custom-consumer-group';

    const module: TestingModule = await Test.createTestingModule({
      providers: [KafkaConsumerService],
    }).compile();

    service = module.get<KafkaConsumerService>(KafkaConsumerService);
    await service.onModuleInit();

    expect(service.getHealthStatus().groupId).toBe('custom-consumer-group');
  });

  it('does not throw when Kafka is unavailable at startup', async () => {
    mockConnect.mockRejectedValueOnce(new Error('broker down'));

    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(service.getHealthStatus()).toMatchObject({
      connected: false,
      lastError: 'broker down',
      lastErrorCode: 'KAFKA_CONNECTION_FAILED',
    });
  });

  it('disconnects on module destroy', async () => {
    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(service.getHealthStatus().connected).toBe(false);
  });
});
