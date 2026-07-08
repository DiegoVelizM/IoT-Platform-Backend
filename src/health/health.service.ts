import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { KafkaConsumerService } from '../kafka/kafka-consumer.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly kafkaConsumer: KafkaConsumerService,
  ) {}

  async getHealth() {
    const database =
      this.connection.readyState === 1 ? 'connected' : 'disconnected';
    const producer = await this.kafkaProducer.probeHealth();
    const consumer = this.kafkaConsumer.getHealthStatus();

    const isHealthy = database === 'connected' && producer.connected;

    return {
      status: isHealthy ? 'ok' : 'degraded',
      service: 'iot-platform-backend',
      database,
      kafka: {
        connected: producer.connected,
        broker: producer.broker,
        mode: producer.mode,
        lastError: producer.lastError,
        lastErrorCode: producer.lastErrorCode,
        consumer: {
          connected: consumer.connected,
          groupId: consumer.groupId,
          messagesConsumed: consumer.messagesConsumed,
          lastError: consumer.lastError,
          lastErrorCode: consumer.lastErrorCode,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }
}
