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

const DEFAULT_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);

  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;
  private lastError?: string;
  private lastErrorCode?:
    | ErrorCode.KAFKA_CONNECTION_FAILED
    | ErrorCode.KAFKA_PUBLISH_FAILED;

  constructor() {
    this.kafka = new Kafka({
      brokers: [DEFAULT_BROKER],
      retry: { retries: 3 },
      connectionTimeout: 5000,
      requestTimeout: 5000,
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
    });
  }

  async onModuleInit() {
    try {
      await this.connect();
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
      broker: DEFAULT_BROKER,
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

      this.logger.log(`Connected to Kafka broker ${DEFAULT_BROKER}`);
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
