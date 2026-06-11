import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSensorReadingDto } from './dto/create-sensor-reading.dto';
import { SensorReading } from './schemas/sensor-reading.schema';
import { AlertsService } from '../alerts/alerts.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { KAFKA_TOPICS } from '../kafka/kafka-topics.constants';
import { EventType } from '../common/events/event-types';
import { randomUUID } from 'crypto';

@Injectable()
export class SensorsService {
    constructor(
        @InjectModel(SensorReading.name)
        private sensorReadingModel: Model<SensorReading>,
        private readonly alertsService: AlertsService,
        private readonly kafkaProducer: KafkaProducerService,
    ) {}

    async create(createSensorReadingDto: CreateSensorReadingDto) {

        const reading = new this.sensorReadingModel({
            ...createSensorReadingDto,
        });
        
        const saveReading = await reading.save();

        await this.kafkaProducer.emit(
          KAFKA_TOPICS.TELEMETRY_RECEIVED,
          {
            eventId: randomUUID(),
            eventType: EventType.TELEMETRY_RECEIVED,
            occurredAt: new Date(),
            source: 'iot-platform',

            sensorId: saveReading.sensorId,
            assetId: saveReading.assetId,
            sensorType: saveReading.sensorType,

            batteryLevel: saveReading.batteryLevel,
            connectionStatus: saveReading.connectionStatus,

            temperature: saveReading.temperature,
            glucoseLevel: saveReading.glucoseLevel,
            oxygenSaturation: saveReading.oxygenSaturation,
            heartRate: saveReading.heartRate,
            systolicPressure: saveReading.systolicPressure,
            diastolicPressure: saveReading.diastolicPressure,
          },
        );

        await this.generateAlertsFromTelemetry(createSensorReadingDto);

        return saveReading;
    }

    private async generateAlertsFromTelemetry(
      data: CreateSensorReadingDto,
  ) {
    // Batería baja
    if (
      data.batteryLevel !== undefined &&
      data.batteryLevel < 20
    ) {
      await this.alertsService.create({
        sensorId: data.sensorId,
        type: 'low_battery',
        severity: data.batteryLevel < 10 ? 'critical' : 'warning',
        message: `Battery level is low: ${data.batteryLevel}%`,
        resolved: false,
      });
    }

    // Sensor desconectado
    if (data.connectionStatus === 'offline') {
      await this.alertsService.create({
        sensorId: data.sensorId,
        type: 'sensor_offline',
        severity: 'critical',
        message: 'Sensor is offline',
        resolved: false,
      });
    }

    // Pérdida de señal
    /*if (
      data.signalStrength !== undefined &&
      data.signalStrength <= -90
    ) {
      await this.alertsService.create({
        sensorId: data.sensorId,
        type: 'signal_lost',
        severity: 'warning',
        message: `Weak signal detected: ${data.signalStrength} dBm`,
        resolved: false,
      });
    }*/

    // Termómetro (cadena de frío)
    if (
      data.temperature !== undefined &&
      (data.temperature < 2 || data.temperature > 8)
    ) {
      await this.alertsService.create({
        sensorId: data.sensorId,
        type: 'temperature_out_of_range',
        severity: 'warning',
        message: `Temperature out of range: ${data.temperature}°C`,
        resolved: false,
      });
    }

    // Glucómetro
    if (
      data.glucoseLevel !== undefined &&
      (data.glucoseLevel < 70 || data.glucoseLevel > 180)
    ) {
      await this.alertsService.create({
        sensorId: data.sensorId,
        type: 'glucose_out_of_range',
        severity:
          data.glucoseLevel < 55 || data.glucoseLevel > 250
            ? 'critical'
            : 'warning',
        message: `Glucose level out of range: ${data.glucoseLevel}`,
        resolved: false,
      });
    }

    // Pulsioxímetro
    if (
      data.oxygenSaturation !== undefined &&
      data.oxygenSaturation < 92
    ) {
      await this.alertsService.create({
        sensorId: data.sensorId,
        type: 'oxygen_saturation_low',
        severity:
          data.oxygenSaturation < 88
            ? 'critical'
            : 'warning',
        message: `Low oxygen saturation: ${data.oxygenSaturation}%`,
        resolved: false,
      });
    }

    if (
      data.heartRate !== undefined &&
      (data.heartRate < 50 || data.heartRate > 120)
    ) {
      await this.alertsService.create({
        sensorId: data.sensorId,
        type: 'heart_rate_out_of_range',
        severity:
          data.heartRate < 40 || data.heartRate > 140
            ? 'critical'
            : 'warning',
        message: `Heart rate out of range: ${data.heartRate} bpm`,
        resolved: false,
      });
    }

  // Presión arterial
  if (
    data.systolicPressure !== undefined &&
    data.diastolicPressure !== undefined &&
    (
      data.systolicPressure >= 140 ||
      data.diastolicPressure >= 90
    )
  ) {
    await this.alertsService.create({
      sensorId: data.sensorId,
      type: 'blood_pressure_high',
      severity:
        data.systolicPressure >= 180 ||
        data.diastolicPressure >= 120
          ? 'critical'
          : 'warning',
      message:
        `Blood pressure elevated: ` +
        `${data.systolicPressure}/${data.diastolicPressure}`,
      resolved: false,
      });
    }
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