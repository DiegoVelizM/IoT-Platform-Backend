import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

const DEFAULT_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';

@Injectable()
export class KafkaProducerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(KafkaProducerService.name);

  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;

  constructor() {
    this.kafka = new Kafka({
      brokers: [DEFAULT_BROKER],
      retry: { retries: 3 },
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
    });
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.isConnected = true;

      this.logger.log(
        `Connected to Kafka broker ${DEFAULT_BROKER}`,
      );
    } catch (err) {
      this.isConnected = false;

      this.logger.error(
        'Kafka connect error',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      this.isConnected = false;
    } catch (err) {
      this.logger.error(
        'Error disconnecting Kafka producer',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async emit<T extends object>(
    topic: string,
    message: T,
  ) {
    try {
      if (!this.isConnected) {
        this.logger.warn(
          'Kafka producer disconnected. Reconnecting...',
        );

        await this.producer.connect();
        this.isConnected = true;
      }

      this.logger.log(
        `Sending message to topic ${topic}`,
      );

      await this.producer.send({
        topic,
        messages: [
          {
            value: JSON.stringify(message),
          },
        ],
      });

      this.logger.log(
        `Message sent to topic ${topic}`,
      );
    } catch (err) {
      this.isConnected = false;

      this.logger.error(
        `Failed to send message to topic ${topic}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}