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
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import { KafkaPublishResult } from '../kafka/interfaces/kafka-publish-result.interface';
import { AnalyticsEventsService } from '../analytics/analytics-events.service';
import { AnalyticsAlertContext } from '../analytics/interfaces/analytics-alert-context.interface';
import { IncidentsEventsService } from '../incidents/incidents-events.service';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectModel(Alert.name)
    private alertModel: Model<Alert>,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly analyticsEventsService: AnalyticsEventsService,
    private readonly incidentsEventsService: IncidentsEventsService,
  ) {}

  async create(
    createAlertDto: CreateAlertDto,
    analyticsContext?: AnalyticsAlertContext,
  ) {
    try {
      const existingActive = await this.alertModel
        .findOne({
          sensorId: createAlertDto.sensorId,
          type: createAlertDto.type,
          resolved: false,
        })
        .exec();

      if (existingActive) {
        this.logger.debug(
          `Skipping duplicate active alert ${createAlertDto.type} for sensor ${createAlertDto.sensorId}`,
        );
        return existingActive.toObject();
      }

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

      if (analyticsContext) {
        this.analyticsEventsService.publishAlert(savedAlert, analyticsContext);
      }

      this.incidentsEventsService.publishAlert(savedAlert, analyticsContext);

      return this.appendWarnings(savedAlert.toObject(), [publishResult]);
    } catch (error) {
      if (this.isDuplicateActiveAlertError(error)) {
        const existingActive = await this.alertModel
          .findOne({
            sensorId: createAlertDto.sensorId,
            type: createAlertDto.type,
            resolved: false,
          })
          .exec();

        if (existingActive) {
          this.logger.debug(
            `Recovered duplicate active alert ${createAlertDto.type} for sensor ${createAlertDto.sensorId}`,
          );
          return existingActive.toObject();
        }
      }

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

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<Alert>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.alertModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.alertModel.countDocuments().exec(),
    ]);

    return { data, page, limit, total };
  }

  async findBySensor(
    sensorId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<Alert>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const filter = { sensorId };

    const [data, total] = await Promise.all([
      this.alertModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.alertModel.countDocuments(filter).exec(),
    ]);

    if (total === 0) {
      throw new ResourceNotFoundException('Alerts', sensorId);
    }

    return { data, page, limit, total };
  }

  private isDuplicateActiveAlertError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: unknown }).code === 11_000
    );
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