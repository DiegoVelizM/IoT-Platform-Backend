import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { KafkaProducerService } from '../kafka/kafka-producer.service';

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  getHealth() {
    const database =
      this.connection.readyState === 1 ? 'connected' : 'disconnected';
    const kafka = this.kafkaProducer.getHealthStatus();

    const isHealthy = database === 'connected' && kafka.connected;

    return {
      status: isHealthy ? 'ok' : 'degraded',
      service: 'iot-platform-backend',
      database,
      kafka: {
        connected: kafka.connected,
        broker: kafka.broker,
        lastError: kafka.lastError,
        lastErrorCode: kafka.lastErrorCode,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
