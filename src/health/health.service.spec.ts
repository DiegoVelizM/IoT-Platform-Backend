import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { HealthService } from './health.service';
import { KafkaConsumerService } from '../kafka/kafka-consumer.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: getConnectionToken(),
          useValue: { readyState: 1 },
        },
        {
          provide: KafkaProducerService,
          useValue: {
            probeHealth: jest.fn().mockResolvedValue({
              connected: true,
              broker: 'kafka:9092',
              mode: 'local',
            }),
          },
        },
        {
          provide: KafkaConsumerService,
          useValue: {
            getHealthStatus: jest.fn().mockReturnValue({
              connected: true,
              groupId: 'iot-platform-consumer',
              messagesConsumed: 12,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('returns ok when mongo and kafka producer are healthy', async () => {
    await expect(service.getHealth()).resolves.toMatchObject({
      status: 'ok',
      service: 'iot-platform-backend',
      database: 'connected',
      kafka: {
        connected: true,
        broker: 'kafka:9092',
        consumer: {
          connected: true,
          groupId: 'iot-platform-consumer',
          messagesConsumed: 12,
        },
      },
    });
  });

  it('returns degraded when kafka producer is disconnected', async () => {
    const kafkaProducer = service['kafkaProducer'] as KafkaProducerService;
    jest.spyOn(kafkaProducer, 'probeHealth').mockResolvedValue({
      connected: false,
      broker: 'kafka:9092',
      lastError: 'broker down',
      lastErrorCode: 'KAFKA_CONNECTION_FAILED',
    });

    await expect(service.getHealth()).resolves.toMatchObject({
      status: 'degraded',
      database: 'connected',
      kafka: expect.objectContaining({ connected: false }),
    });
  });

  it('keeps status ok when only kafka consumer is disconnected', async () => {
    const kafkaConsumer = service['kafkaConsumer'] as KafkaConsumerService;
    jest.spyOn(kafkaConsumer, 'getHealthStatus').mockReturnValue({
      connected: false,
      groupId: 'iot-platform-consumer',
      messagesConsumed: 0,
      lastError: 'consumer down',
      lastErrorCode: 'KAFKA_CONNECTION_FAILED',
    });

    await expect(service.getHealth()).resolves.toMatchObject({
      status: 'ok',
      kafka: {
        connected: true,
        consumer: expect.objectContaining({ connected: false }),
      },
    });
  });
});
