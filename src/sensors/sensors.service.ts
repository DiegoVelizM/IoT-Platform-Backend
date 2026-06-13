import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { CreateSensorReadingDto } from './dto/create-sensor-reading.dto';
import { SensorReading } from './schemas/sensor-reading.schema';
import { AlertsService } from '../alerts/alerts.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { KAFKA_TOPICS } from '../kafka/kafka-topics.constants';
import { EventType } from '../common/events/event-types';
import { SENSOR_THRESHOLDS } from './constants/sensor-thresholds.constants';

@Injectable()
export class SensorsService {
  private readonly logger = new Logger(SensorsService.name);
  constructor(
    @InjectModel(SensorReading.name)
    private sensorReadingModel: Model<SensorReading>,
    private readonly alertsService: AlertsService,
    private readonly kafkaProducer: KafkaProducerService,
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

      await this.publishTelemetryReceived(savedReading);
      await this.generateAlertsFromTelemetry(createSensorReadingDto);
      this.logger.log(
        `Telemetry processed successfully for sensor ${savedReading.sensorId}`,
      );

      return savedReading;
    } catch (error) {
      this.logger.error(
        `Failed to process sensor reading for ${createSensorReadingDto.sensorId}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }

  private async publishTelemetryReceived(reading: SensorReading) {
    await this.kafkaProducer.emit(KAFKA_TOPICS.TELEMETRY_RECEIVED, {
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

  private async generateAlertsFromTelemetry(data: CreateSensorReadingDto) {
    await this.checkSensorOfflineAlert(data);

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

    await this.alertsService.create({
      sensorId: data.sensorId,
      type: 'low_battery',
      severity:
        data.batteryLevel < SENSOR_THRESHOLDS.BATTERY.CRITICAL
          ? 'critical'
          : 'warning',
      message: `Battery level is low: ${data.batteryLevel}%`,
      resolved: false,
    });
  }

  private async checkSensorOfflineAlert(data: CreateSensorReadingDto) {
    if (data.connectionStatus !== 'offline') {
      return;
    }

    await this.alertsService.create({
      sensorId: data.sensorId,
      type: 'sensor_offline',
      severity: 'critical',
      message: 'Sensor is offline',
      resolved: false,
    });

    await this.kafkaProducer.emit(KAFKA_TOPICS.SENSOR_OFFLINE, {
      eventId: randomUUID(),
      eventType: EventType.SENSOR_OFFLINE,
      occurredAt: new Date(),
      source: 'iot-platform',
      sensorId: data.sensorId,
      assetId: data.assetId,
      sensorType: data.sensorType,
      connectionStatus: data.connectionStatus,
    });
  }

  private async checkColdChainTemperatureAlert(data: CreateSensorReadingDto) {
    if (
      data.temperature === undefined ||
      (data.temperature >= SENSOR_THRESHOLDS.COLD_CHAIN_TEMPERATURE.MIN &&
        data.temperature <= SENSOR_THRESHOLDS.COLD_CHAIN_TEMPERATURE.MAX)
    ) {
      return;
    }

    await this.alertsService.create({
      sensorId: data.sensorId,
      type: 'temperature_out_of_range',
      severity: 'warning',
      message: `Temperature out of range: ${data.temperature}°C`,
      resolved: false,
    });
  }

  private async checkGlucoseAlert(data: CreateSensorReadingDto) {
    if (
      data.glucoseLevel === undefined ||
      (data.glucoseLevel >= SENSOR_THRESHOLDS.GLUCOSE.LOW &&
        data.glucoseLevel <= SENSOR_THRESHOLDS.GLUCOSE.HIGH)
    ) {
      return;
    }

    await this.alertsService.create({
      sensorId: data.sensorId,
      type: 'glucose_out_of_range',
      severity:
        data.glucoseLevel < SENSOR_THRESHOLDS.GLUCOSE.CRITICAL_LOW ||
        data.glucoseLevel > SENSOR_THRESHOLDS.GLUCOSE.CRITICAL_HIGH
          ? 'critical'
          : 'warning',
      message: `Glucose level out of range: ${data.glucoseLevel}`,
      resolved: false,
    });
  }

  private async checkOxygenSaturationAlert(data: CreateSensorReadingDto) {
    if (
      data.oxygenSaturation === undefined ||
      data.oxygenSaturation >= SENSOR_THRESHOLDS.OXYGEN_SATURATION.LOW
    ) {
      return;
    }

    await this.alertsService.create({
      sensorId: data.sensorId,
      type: 'oxygen_saturation_low',
      severity:
        data.oxygenSaturation < SENSOR_THRESHOLDS.OXYGEN_SATURATION.CRITICAL
          ? 'critical'
          : 'warning',
      message: `Low oxygen saturation: ${data.oxygenSaturation}%`,
      resolved: false,
    });
  }

  private async checkHeartRateAlert(data: CreateSensorReadingDto) {
    if (
      data.heartRate === undefined ||
      (data.heartRate >= SENSOR_THRESHOLDS.HEART_RATE.LOW &&
        data.heartRate <= SENSOR_THRESHOLDS.HEART_RATE.HIGH)
    ) {
      return;
    }

    await this.alertsService.create({
      sensorId: data.sensorId,
      type: 'heart_rate_out_of_range',
      severity:
        data.heartRate < SENSOR_THRESHOLDS.HEART_RATE.CRITICAL_LOW ||
        data.heartRate > SENSOR_THRESHOLDS.HEART_RATE.CRITICAL_HIGH
          ? 'critical'
          : 'warning',
      message: `Heart rate out of range: ${data.heartRate} bpm`,
      resolved: false,
    });
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

    await this.alertsService.create({
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
    });
  }

  async findAll() {
    return this.sensorReadingModel.find().sort({ createdAt: -1 }).exec();
  }

  async findLatest() {
    return this.sensorReadingModel.findOne().sort({ createdAt: -1 }).exec();
  }

  async findBySensor(sensorId: string) {
    return this.sensorReadingModel
      .find({ sensorId })
      .sort({ createdAt: -1 })
      .exec();
  }
}