import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AlertsService } from '../alerts/alerts.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { KAFKA_TOPICS } from '../kafka/kafka-topics.constants';

type AnyReading = Record<string, any>;

const DEFAULT_LOW_BATTERY = 20;

@Injectable()
export class SensorsService {
  private readonly logger = new Logger(SensorsService.name);

  constructor(
    @InjectModel('SensorReading')
    private sensorReadingModel: Model<AnyReading>,
    private readonly alertsService: AlertsService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  async create(createSensorReadingDto: AnyReading) {
    const payload: AnyReading = {
      sensor_id:
        createSensorReadingDto.sensor_id || createSensorReadingDto.sensorId,
      asset_id:
        createSensorReadingDto.asset_id || createSensorReadingDto.assetId,
      sensor_type:
        createSensorReadingDto.sensor_type ||
        createSensorReadingDto.sensorType ||
        inferSensorType(createSensorReadingDto),
      timestamp: createSensorReadingDto.timestamp || new Date(),
      ...createSensorReadingDto,
    };

    const saveReading = await this.sensorReadingModel.create(payload);

    // Emit telemetry_received
    try {
      await this.kafkaProducer.emit(KAFKA_TOPICS.TELEMETRY_RECEIVED, {
        source: 'iot_devices',
        event_type: KAFKA_TOPICS.TELEMETRY_RECEIVED,
        payload: saveReading,
      });
    } catch (err) {
      this.logger.error('Kafka emit error: ' + err);
    }

    await this.generateAlertsFromTelemetry(payload);

    return saveReading;
  }

  async findAll() {
    return this.sensorReadingModel.find().sort({ createdAt: -1 }).exec();
  }

  async findLatestForAsset(assetId: string) {
    return this.sensorReadingModel
      .findOne({ asset_id: assetId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findLatestByTypeForAsset(assetId: string, sensorType: string) {
    return this.sensorReadingModel
      .findOne({ asset_id: assetId, sensor_type: sensorType })
      .sort({ timestamp: -1 })
      .exec();
  }

  async findLatest() {
    return this.sensorReadingModel.findOne().sort({ createdAt: -1 }).exec();
  }

  async findBySensor(sensorId: string) {
    return this.sensorReadingModel
      .find({ sensor_id: sensorId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getSensorsList() {
    const sensors = await this.sensorReadingModel
      .aggregate([
        { $sort: { timestamp: -1 } },
        {
          $group: {
            _id: '$sensor_id',
            sensor_type: { $first: '$sensor_type' },
            last_seen: { $first: '$timestamp' },
            asset_id: { $first: '$asset_id' },
          },
        },
        {
          $project: {
            sensor_id: '$_id',
            sensor_type: 1,
            last_seen: 1,
            asset_id: 1,
            _id: 0,
          },
        },
      ])
      .exec();

    const result = sensors.map((s: any) => ({
      sensor_id: s.sensor_id,
      sensor_type: s.sensor_type,
      last_seen: s.last_seen,
      status:
        (new Date().getTime() - new Date(s.last_seen).getTime()) / 1000 < 60
          ? 'online'
          : 'offline',
      asset_id: s.asset_id,
    }));

    return result;
  }

  async getSensorDetail(sensorId: string) {
    const latest = await this.sensorReadingModel
      .findOne({ sensor_id: sensorId })
      .sort({ timestamp: -1 })
      .exec();
    return latest;
  }

  async findHistory(assetId: string, filter: any, page = 1, pageSize = 20) {
    const query: any = {};
    if (assetId) query.asset_id = assetId;
    if (filter.sensor_type) query.sensor_type = filter.sensor_type;
    if (filter.startDate || filter.endDate) query.timestamp = {};
    if (filter.startDate) query.timestamp.$gte = new Date(filter.startDate);
    if (filter.endDate) query.timestamp.$lte = new Date(filter.endDate);

    return this.sensorReadingModel
      .find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();
  }

  private async generateAlertsFromTelemetry(data: AnyReading) {
    // battery
    const battery = data.battery ?? data.batteryLevel ?? data.battery;
    if (battery !== undefined && battery < DEFAULT_LOW_BATTERY) {
      await this.createAlert({
        sensorId: data.sensor_id,
        assetId: data.asset_id,
        type: 'low_battery',
        severity: battery < 10 ? 'critical' : 'warning',
        message: `Battery low: ${battery}%`,
        resolved: false,
      });
    }

    // temperature
    if (data.sensor_type === 'temperature' || data.temperature) {
      const temp = data.temperature;
      if (temp !== undefined && temp > 38) {
        await this.createAlert({
          sensorId: data.sensor_id,
          assetId: data.asset_id,
          type: 'temperature_alert',
          severity: temp >= 40 ? 'critical' : 'warning',
          message: `High temperature: ${temp}`,
          resolved: false,
        });
      }
    }

    // glucose
    if (data.sensor_type === 'glucose' || data.glucose) {
      const g = data.glucose;
      if (g !== undefined && g > 180) {
        await this.createAlert({
          sensorId: data.sensor_id,
          assetId: data.asset_id,
          type: 'glucose_alert',
          severity: g >= 250 ? 'critical' : 'warning',
          message: `High glucose: ${g}`,
          resolved: false,
        });
      }
    }

    // heart rate
    if (data.sensor_type === 'heart_rate' || data.heart_rate) {
      const hr = data.heart_rate;
      if (hr !== undefined && (hr < 40 || hr > 130)) {
        await this.createAlert({
          sensorId: data.sensor_id,
          assetId: data.asset_id,
          type: 'heart_rate_alert',
          severity: hr < 30 || hr > 150 ? 'critical' : 'warning',
          message: `Abnormal heart rate: ${hr}`,
          resolved: false,
        });
      }
    }

    // blood pressure
    if (
      data.sensor_type === 'blood_pressure' ||
      (data.systolic && data.diastolic)
    ) {
      const s = data.systolic;
      const d = data.diastolic;
      if (s !== undefined && d !== undefined && (s > 180 || d > 120)) {
        await this.createAlert({
          sensorId: data.sensor_id,
          assetId: data.asset_id,
          type: 'blood_pressure_alert',
          severity: s > 200 || d > 130 ? 'critical' : 'warning',
          message: `High blood pressure: ${s}/${d}`,
          resolved: false,
        });
      }
    }
  }

  private async createAlert(dto: any) {
    const alert = await this.alertsService.create({
      sensorId: dto.sensorId,
      assetId: dto.assetId,
      type: dto.type,
      severity: dto.severity,
      message: dto.message,
      resolved: dto.resolved ?? false,
    });

    // emit alert event via kafka
    try {
      await this.kafkaProducer.emit(dto.type, {
        event_type: dto.type,
        asset_id: dto.assetId,
        sensor_id: dto.sensorId,
        severity: dto.severity,
        message: dto.message,
        timestamp: new Date(),
      });
    } catch (err) {
      this.logger.error('Kafka emit alert error: ' + err);
    }

    // check patient critical
    if (dto.severity === 'critical' && dto.assetId) {
      const count = await this.alertsService.countActiveCriticalByAsset(
        dto.assetId,
      );
      if (count >= 2) {
        await this.kafkaProducer.emit(KAFKA_TOPICS.PATIENT_CRITICAL, {
          event_type: KAFKA_TOPICS.PATIENT_CRITICAL,
          asset_id: dto.assetId,
          critical_alerts: count,
          timestamp: new Date(),
        });
      }
    }
  }
}

function inferSensorType(data: AnyReading) {
  if (data.temperature !== undefined) return 'temperature';
  if (data.glucose !== undefined) return 'glucose';
  if (data.heart_rate !== undefined) return 'heart_rate';
  if (data.systolic !== undefined && data.diastolic !== undefined)
    return 'blood_pressure';
  return 'environmental';
}
