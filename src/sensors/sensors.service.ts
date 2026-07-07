import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { randomUUID } from 'crypto';
import { CreateSensorReadingDto } from './dto/create-sensor-reading.dto';
import { SensorReading } from './schemas/sensor-reading.schema';
import { AlertsService } from '../alerts/alerts.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { KAFKA_TOPICS } from '../kafka/kafka-topics.constants';
import { EventType } from '../common/events/event-types';
import { SENSOR_THRESHOLDS } from './constants/sensor-thresholds.constants';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';
import { OperationWarningDto } from '../common/dto/operation-warning.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import { ListSensorDevicesQueryDto } from './dto/list-sensor-devices-query.dto';
import { SensorDeviceResponseDto } from './dto/sensor-device-response.dto';
import { KafkaPublishResult } from '../kafka/interfaces/kafka-publish-result.interface';
import { AnalyticsEventsService } from '../analytics/analytics-events.service';
import { AnalyticsAlertContext } from '../analytics/interfaces/analytics-alert-context.interface';

@Injectable()
export class SensorsService {
  private readonly logger = new Logger(SensorsService.name);
  constructor(
    @InjectModel(SensorReading.name)
    private sensorReadingModel: Model<SensorReading>,
    private readonly alertsService: AlertsService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly analyticsEventsService: AnalyticsEventsService,
  ) {}

  async create(createSensorReadingDto: CreateSensorReadingDto) {
    try {
      const reading = new this.sensorReadingModel({
        ...createSensorReadingDto,
      });

      const savedReading = await reading.save();

      this.logger.log(
        `Sensor reading saved for ${savedReading.sensorId}`,
      );

      const kafkaResults: KafkaPublishResult[] = [];
      const telemetryResult = await this.publishTelemetryReceived(savedReading);
      kafkaResults.push(telemetryResult);
      this.analyticsEventsService.publishTelemetry(savedReading);

      await this.generateAlertsFromTelemetry(
        createSensorReadingDto,
        kafkaResults,
      );
      this.logger.log(
        `Telemetry processed successfully for sensor ${savedReading.sensorId}`,
      );

      return this.appendWarnings(savedReading.toObject(), kafkaResults);
    } catch (error) {
      this.logger.error(
        `Failed to process sensor reading for ${createSensorReadingDto.sensorId}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }

  private async publishTelemetryReceived(reading: SensorReading) {
    return this.kafkaProducer.emit(KAFKA_TOPICS.TELEMETRY_RECEIVED, {
      eventId: randomUUID(),
      eventType: EventType.TELEMETRY_RECEIVED,
      occurredAt: new Date(),
      source: 'iot-platform',

      sensorId: reading.sensorId,
      assetId: reading.assetId,
      sensorType: reading.sensorType,

      batteryLevel: reading.batteryLevel,
      connectionStatus: reading.connectionStatus,

      temperature: reading.temperature,
      glucoseLevel: reading.glucoseLevel,
      oxygenSaturation: reading.oxygenSaturation,
      heartRate: reading.heartRate,
      systolicPressure: reading.systolicPressure,
      diastolicPressure: reading.diastolicPressure,
    });
  }

  private async generateAlertsFromTelemetry(
    data: CreateSensorReadingDto,
    kafkaResults: KafkaPublishResult[],
  ) {
    await this.checkSensorOfflineAlert(data, kafkaResults);

    const alertChecks = [
      () => this.checkBatteryAlert(data),
      () => this.checkColdChainTemperatureAlert(data),
      () => this.checkGlucoseAlert(data),
      () => this.checkOxygenSaturationAlert(data),
      () => this.checkHeartRateAlert(data),
      () => this.checkBloodPressureAlert(data),
    ];

    await Promise.all(alertChecks.map((check) => check()));
  }

  private async checkBatteryAlert(data: CreateSensorReadingDto) {
    if (
      data.batteryLevel === undefined ||
      data.batteryLevel >= SENSOR_THRESHOLDS.BATTERY.LOW
    ) {
      return;
    }

    await this.alertsService.create(
      {
      sensorId: data.sensorId,
      type: 'low_battery',
      severity:
        data.batteryLevel < SENSOR_THRESHOLDS.BATTERY.CRITICAL
          ? 'critical'
          : 'warning',
      message: `Battery level is low: ${data.batteryLevel}%`,
      resolved: false,
    },
      this.buildAnalyticsContext(data, 'low_battery'),
    );
  }

  private async checkSensorOfflineAlert(
    data: CreateSensorReadingDto,
    kafkaResults: KafkaPublishResult[],
  ) {
    if (data.connectionStatus !== 'offline') {
      return;
    }

    await this.alertsService.create(
      {
      sensorId: data.sensorId,
      type: 'sensor_offline',
      severity: 'critical',
      message: 'Sensor is offline',
      resolved: false,
    },
      this.buildAnalyticsContext(data, 'sensor_offline'),
    );

    const publishResult = await this.kafkaProducer.emit(
      KAFKA_TOPICS.SENSOR_OFFLINE,
      {
      eventId: randomUUID(),
      eventType: EventType.SENSOR_OFFLINE,
      occurredAt: new Date(),
      source: 'iot-platform',
      sensorId: data.sensorId,
      assetId: data.assetId,
      sensorType: data.sensorType,
      connectionStatus: data.connectionStatus,
    },
    );

    kafkaResults.push(publishResult);
  }

  private async checkColdChainTemperatureAlert(data: CreateSensorReadingDto) {
    if (
      data.temperature === undefined ||
      (data.temperature >= SENSOR_THRESHOLDS.COLD_CHAIN_TEMPERATURE.MIN &&
        data.temperature <= SENSOR_THRESHOLDS.COLD_CHAIN_TEMPERATURE.MAX)
    ) {
      return;
    }

    await this.alertsService.create(
      {
      sensorId: data.sensorId,
      type: 'temperature_out_of_range',
      severity: 'warning',
      message: `Temperature out of range: ${data.temperature}°C`,
      resolved: false,
    },
      this.buildAnalyticsContext(data, 'temperature_out_of_range'),
    );
  }

  private async checkGlucoseAlert(data: CreateSensorReadingDto) {
    if (
      data.glucoseLevel === undefined ||
      (data.glucoseLevel >= SENSOR_THRESHOLDS.GLUCOSE.LOW &&
        data.glucoseLevel <= SENSOR_THRESHOLDS.GLUCOSE.HIGH)
    ) {
      return;
    }

    await this.alertsService.create(
      {
      sensorId: data.sensorId,
      type: 'glucose_out_of_range',
      severity:
        data.glucoseLevel < SENSOR_THRESHOLDS.GLUCOSE.CRITICAL_LOW ||
        data.glucoseLevel > SENSOR_THRESHOLDS.GLUCOSE.CRITICAL_HIGH
          ? 'critical'
          : 'warning',
      message: `Glucose level out of range: ${data.glucoseLevel}`,
      resolved: false,
    },
      this.buildAnalyticsContext(data, 'glucose_out_of_range'),
    );
  }

  private async checkOxygenSaturationAlert(data: CreateSensorReadingDto) {
    if (
      data.oxygenSaturation === undefined ||
      data.oxygenSaturation >= SENSOR_THRESHOLDS.OXYGEN_SATURATION.LOW
    ) {
      return;
    }

    await this.alertsService.create(
      {
      sensorId: data.sensorId,
      type: 'oxygen_saturation_low',
      severity:
        data.oxygenSaturation < SENSOR_THRESHOLDS.OXYGEN_SATURATION.CRITICAL
          ? 'critical'
          : 'warning',
      message: `Low oxygen saturation: ${data.oxygenSaturation}%`,
      resolved: false,
    },
      this.buildAnalyticsContext(data, 'oxygen_saturation_low'),
    );
  }

  private async checkHeartRateAlert(data: CreateSensorReadingDto) {
    if (
      data.heartRate === undefined ||
      (data.heartRate >= SENSOR_THRESHOLDS.HEART_RATE.LOW &&
        data.heartRate <= SENSOR_THRESHOLDS.HEART_RATE.HIGH)
    ) {
      return;
    }

    await this.alertsService.create(
      {
      sensorId: data.sensorId,
      type: 'heart_rate_out_of_range',
      severity:
        data.heartRate < SENSOR_THRESHOLDS.HEART_RATE.CRITICAL_LOW ||
        data.heartRate > SENSOR_THRESHOLDS.HEART_RATE.CRITICAL_HIGH
          ? 'critical'
          : 'warning',
      message: `Heart rate out of range: ${data.heartRate} bpm`,
      resolved: false,
    },
      this.buildAnalyticsContext(data, 'heart_rate_out_of_range'),
    );
  }

  private async checkBloodPressureAlert(data: CreateSensorReadingDto) {
    if (
      data.systolicPressure === undefined ||
      data.diastolicPressure === undefined ||
      (data.systolicPressure < SENSOR_THRESHOLDS.BLOOD_PRESSURE.SYSTOLIC_HIGH &&
        data.diastolicPressure <
          SENSOR_THRESHOLDS.BLOOD_PRESSURE.DIASTOLIC_HIGH)
    ) {
      return;
    }

    await this.alertsService.create(
      {
      sensorId: data.sensorId,
      type: 'blood_pressure_high',
      severity:
        data.systolicPressure >=
          SENSOR_THRESHOLDS.BLOOD_PRESSURE.SYSTOLIC_CRITICAL ||
        data.diastolicPressure >=
          SENSOR_THRESHOLDS.BLOOD_PRESSURE.DIASTOLIC_CRITICAL
          ? 'critical'
          : 'warning',
      message: `Blood pressure elevated: ${data.systolicPressure}/${data.diastolicPressure}`,
      resolved: false,
    },
      this.buildAnalyticsContext(data, 'blood_pressure_high'),
    );
  }

  private buildAnalyticsContext(
    data: CreateSensorReadingDto,
    alertType: string,
  ): AnalyticsAlertContext {
    return {
      assetId: data.assetId,
      sensorType: data.sensorType,
      batteryLevel: data.batteryLevel,
      connectionStatus: data.connectionStatus,
      currentValue: this.extractCurrentValue(data, alertType),
    };
  }

  private extractCurrentValue(
    data: CreateSensorReadingDto,
    alertType: string,
  ): number | undefined {
    switch (alertType) {
      case 'temperature_out_of_range':
        return data.temperature;
      case 'glucose_out_of_range':
        return data.glucoseLevel;
      case 'oxygen_saturation_low':
        return data.oxygenSaturation;
      case 'heart_rate_out_of_range':
        return data.heartRate;
      case 'blood_pressure_high':
        return data.systolicPressure;
      default:
        return undefined;
    }
  }

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<SensorReading>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.sensorReadingModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.sensorReadingModel.countDocuments().exec(),
    ]);

    return { data, page, limit, total };
  }

  async findDevices(
    query: ListSensorDevicesQueryDto,
  ): Promise<PaginatedResponse<SensorDeviceResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const preMatch: Record<string, unknown> = {};

    if (query.sensorType) {
      preMatch.sensorType = query.sensorType;
    }

    const search = query.search?.trim();
    if (search) {
      preMatch.sensorId = { $regex: search, $options: 'i' };
    }

    const pipeline: PipelineStage[] = [];

    if (Object.keys(preMatch).length > 0) {
      pipeline.push({ $match: preMatch });
    }

    pipeline.push(
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$sensorId',
          sensorId: { $first: '$sensorId' },
          assetId: { $first: '$assetId' },
          sensorType: { $first: '$sensorType' },
          batteryLevel: { $first: '$batteryLevel' },
          connectionStatus: { $first: '$connectionStatus' },
          lastReadingAt: { $first: '$createdAt' },
        },
      },
      { $sort: { lastReadingAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          meta: [{ $count: 'total' }],
        },
      },
    );

    const [result] = await this.sensorReadingModel.aggregate<{
      data: SensorDeviceResponseDto[];
      meta: Array<{ total: number }>;
    }>(pipeline);

    return {
      data: result?.data ?? [],
      page,
      limit,
      total: result?.meta?.[0]?.total ?? 0,
    };
  }

  async findLatest() {
    const reading = await this.sensorReadingModel
      .findOne()
      .sort({ createdAt: -1 })
      .exec();

    if (!reading) {
      throw new ResourceNotFoundException('Sensor readings', 'latest');
    }

    return reading;
  }

  async findBySensor(
    sensorId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<SensorReading>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const filter = { sensorId };

    const [data, total] = await Promise.all([
      this.sensorReadingModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.sensorReadingModel.countDocuments(filter).exec(),
    ]);

    if (total === 0) {
      throw new ResourceNotFoundException('Sensor readings', sensorId);
    }

    return { data, page, limit, total };
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