import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { ErrorCode } from '../common/errors/error-codes';
import {
  KafkaHealthStatus,
  KafkaPublishResult,
} from './interfaces/kafka-publish-result.interface';
import { resolveKafkaConfig } from './kafka.config';
import { KAFKA_TOPICS } from './kafka-topics.constants';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly kafkaSettings = resolveKafkaConfig();

  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;
  private lastError?: string;
  private lastErrorCode?:
    | ErrorCode.KAFKA_CONNECTION_FAILED
    | ErrorCode.KAFKA_PUBLISH_FAILED;

  constructor() {
    this.kafka = new Kafka(this.kafkaSettings.kafkaConfig);

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
    });
  }

  async onModuleInit() {
    try {
      await this.connect();
      await this.ensureTopics();
    } catch {
      this.logger.warn(
        'Kafka unavailable at startup. API will continue without event publishing.',
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

  getHealthStatus(): KafkaHealthStatus {
    return {
      connected: this.isConnected,
      broker: this.kafkaSettings.brokers[0],
      mode: this.kafkaSettings.mode,
      lastError: this.lastError,
      lastErrorCode: this.lastErrorCode,
    };
  }

  async probeHealth(): Promise<KafkaHealthStatus> {
    const admin = this.kafka.admin();

    try {
      await admin.connect();
      await admin.listTopics();
      await admin.disconnect();

      if (!this.isConnected) {
        await this.connect();
      } else {
        this.lastError = undefined;
        this.lastErrorCode = undefined;
      }

      return this.getHealthStatus();
    } catch (err) {
      this.isConnected = false;

      const errorMessage = err instanceof Error ? err.message : String(err);
      this.registerError(ErrorCode.KAFKA_CONNECTION_FAILED, errorMessage);

      try {
        await admin.disconnect();
      } catch {
        // Ignorar error al cerrar cliente admin tras fallo de probe
      }

      return this.getHealthStatus();
    }
  }

  async emit<T extends object>(
    topic: string,
    message: T,
  ): Promise<KafkaPublishResult> {
    try {
      if (!this.isConnected) {
        this.logger.warn('Kafka producer disconnected. Reconnecting...');
        await this.connect();
      }

      this.logger.log(`Sending message to topic ${topic}`);

      await this.producer.send({
        topic,
        messages: [
          {
            value: JSON.stringify(message),
          },
        ],
      });

      this.lastError = undefined;
      this.lastErrorCode = undefined;

      this.logger.log(`Message sent to topic ${topic}`);

      return { success: true, topic };
    } catch (err) {
      this.isConnected = false;

      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorCode = this.lastErrorCode ?? ErrorCode.KAFKA_PUBLISH_FAILED;

      this.registerError(errorCode, errorMessage);

      this.logger.error(
        `Failed to send message to topic ${topic}`,
        err instanceof Error ? err.stack : String(err),
      );

      return {
        success: false,
        topic,
        errorCode,
        errorMessage,
      };
    }
  }

  private async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.isConnected = true;
      this.lastError = undefined;
      this.lastErrorCode = undefined;

      this.logger.log(
        `Connected to Kafka (${this.kafkaSettings.mode}) at ${this.kafkaSettings.brokers[0]}`,
      );
    } catch (err) {
      this.isConnected = false;

      const errorMessage = err instanceof Error ? err.message : String(err);

      this.registerError(ErrorCode.KAFKA_CONNECTION_FAILED, errorMessage);

      this.logger.error(
        'Kafka connect error',
        err instanceof Error ? err.stack : String(err),
      );

      throw err;
    }
  }

  private async ensureTopics(): Promise<void> {
    const topics = Object.values(KAFKA_TOPICS);
    const admin = this.kafka.admin();

    try {
      await admin.connect();

      await admin.createTopics({
        topics: topics.map((topic) => ({
          topic,
          numPartitions: 1,
          replicationFactor: 1,
        })),
        waitForLeaders: true,
      });

      this.logger.log(`Kafka topics ensured: ${topics.join(', ')}`);
    } catch (err) {
      this.logger.warn(
        'Could not ensure Kafka topics',
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      try {
        await admin.disconnect();
      } catch {
        // Ignorar error al cerrar admin tras ensureTopics
      }
    }
  }

  private registerError(
    errorCode:
      | ErrorCode.KAFKA_CONNECTION_FAILED
      | ErrorCode.KAFKA_PUBLISH_FAILED,
    errorMessage: string,
  ): void {
    this.lastError = errorMessage;
    this.lastErrorCode = errorCode;
  }
}
