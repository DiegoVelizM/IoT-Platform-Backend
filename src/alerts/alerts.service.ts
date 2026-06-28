import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { Alert } from './schemas/alert.schema';
import { CreateAlertDto } from './dto/create-alert.dto';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { KAFKA_TOPICS } from '../kafka/kafka-topics.constants';
import { EventType } from '../common/events/event-types';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';
import { OperationWarningDto } from '../common/dto/operation-warning.dto';
import { KafkaPublishResult } from '../kafka/interfaces/kafka-publish-result.interface';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectModel(Alert.name)
    private alertModel: Model<Alert>,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  async create(createAlertDto: CreateAlertDto) {
    try {
      const alert = new this.alertModel(createAlertDto);
      const savedAlert = await alert.save();

      const publishResult = await this.kafkaProducer.emit(
        KAFKA_TOPICS.ALERT_GENERATED,
        {
        eventId: randomUUID(),
        eventType: EventType.ALERT_GENERATED,
        occurredAt: new Date(),
        source: 'iot-platform',
        sensorId: savedAlert.sensorId,
        alertType: savedAlert.type,
        severity: savedAlert.severity,
        message: savedAlert.message,
      },
      );

      this.logger.log(
        `Alert generated: ${savedAlert.type} for sensor ${savedAlert.sensorId}`,
      );

      return this.appendWarnings(savedAlert.toObject(), [publishResult]);
    } catch (error) {
      this.logger.error(
        'Failed to create and publish alert',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async createMany(alerts: CreateAlertDto[]) {
    if (alerts.length === 0) {
      return [];
    }

    try {
      const savedAlerts = await this.alertModel.insertMany(alerts);

      this.logger.log(`Generated ${savedAlerts.length} alerts`);

      return savedAlerts;
    } catch (error) {
      this.logger.error(
        'Failed to create alerts in batch',
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }

  async findAll() {
    return this.alertModel.find().sort({ createdAt: -1 }).exec();
  }

  async findBySensor(sensorId: string) {
    const alerts = await this.alertModel
      .find({ sensorId })
      .sort({ createdAt: -1 })
      .exec();

    if (alerts.length === 0) {
      throw new ResourceNotFoundException('Alerts', sensorId);
    }

    return alerts;
  }

  private appendWarnings<T extends object>(
    data: T,
    kafkaResults: KafkaPublishResult[],
  ): T & { warnings?: OperationWarningDto[] } {
    const warnings = kafkaResults
      .filter((result) => !result.success)
      .map((result) => ({
        code: result.errorCode!,
        message:
          result.errorMessage ??
          `Failed to publish event to topic ${result.topic}`,
        topic: result.topic,
      }));

    if (warnings.length === 0) {
      return data;
    }

    return { ...data, warnings };
  }
}