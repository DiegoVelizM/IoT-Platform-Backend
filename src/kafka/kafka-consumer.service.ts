import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Consumer, Kafka } from 'kafkajs';
import { ErrorCode } from '../common/errors/error-codes';
import { KafkaConsumerHealthStatus } from './interfaces/kafka-publish-result.interface';
import { resolveKafkaConfig } from './kafka.config';
import { KAFKA_TOPICS } from './kafka-topics.constants';

const DEFAULT_CONSUMER_GROUP_ID = 'iot-platform-consumer';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private readonly kafkaSettings = resolveKafkaConfig();
  private readonly groupId =
    process.env.KAFKA_CONSUMER_GROUP_ID ?? DEFAULT_CONSUMER_GROUP_ID;

  private kafka: Kafka;
  private consumer: Consumer;
  private consumerRunning = false;
  private isConnected = false;
  private messagesConsumed = 0;
  private lastError?: string;
  private lastErrorCode?: ErrorCode.KAFKA_CONNECTION_FAILED;

  constructor() {
    this.kafka = new Kafka(this.kafkaSettings.kafkaConfig);

    this.consumer = this.kafka.consumer({
      groupId: this.groupId,
    });
  }

  async onModuleInit() {
    try {
      await this.connect();

      await this.consumer.subscribe({
        topics: [
          KAFKA_TOPICS.TELEMETRY_RECEIVED,
          KAFKA_TOPICS.ALERT_GENERATED,
          KAFKA_TOPICS.SENSOR_OFFLINE,
        ],
        fromBeginning: false,
      });

      this.logger.log('Kafka consumer subscribed to topics.');

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            if (!message.value) {
              this.logger.warn(`Empty message received from topic ${topic}`);
              return;
            }

            const payload = JSON.parse(message.value.toString());
            this.messagesConsumed++;

            this.logger.log(
              `Consumed ${topic} [partition ${partition}] sensor=${payload.sensorId ?? 'n/a'} event=${payload.eventType ?? 'n/a'} total=${this.messagesConsumed}`,
            );
          } catch (err) {
            this.logger.error(
              'Error processing Kafka message',
              err instanceof Error ? err.stack : String(err),
            );
          }
        },
      });

      this.consumerRunning = true;

      this.logger.log('Kafka consumer is running.');
    } catch {
      this.isConnected = false;
      this.logger.warn(
        'Kafka unavailable at startup. API will continue without consuming events.',
      );
    }
  }

  async onModuleDestroy() {
    try {
      if (this.consumerRunning) {
        await this.consumer.stop();
        this.consumerRunning = false;
        this.logger.log('Kafka consumer stopped.');
      }

      await this.consumer.disconnect();
      this.isConnected = false;
      this.logger.log('Kafka consumer disconnected.');
    } catch (err) {
      this.logger.error(
        'Error disconnecting Kafka consumer',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  getHealthStatus(): KafkaConsumerHealthStatus {
    return {
      connected: this.isConnected,
      groupId: this.groupId,
      messagesConsumed: this.messagesConsumed,
      lastError: this.lastError,
      lastErrorCode: this.lastErrorCode,
    };
  }

  private async connect(): Promise<void> {
    try {
      await this.consumer.connect();
      this.isConnected = true;
      this.lastError = undefined;
      this.lastErrorCode = undefined;

      this.logger.log(
        `Connected to Kafka consumer (${this.kafkaSettings.mode}) at ${this.kafkaSettings.brokers[0]} group=${this.groupId}`,
      );
    } catch (err) {
      this.isConnected = false;

      const errorMessage = err instanceof Error ? err.message : String(err);
      this.registerError(errorMessage);

      this.logger.error(
        'Kafka consumer connection error',
        err instanceof Error ? err.stack : String(err),
      );

      throw err;
    }
  }

  private registerError(errorMessage: string): void {
    this.lastError = errorMessage;
    this.lastErrorCode = ErrorCode.KAFKA_CONNECTION_FAILED;
  }
}
