import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';

import { Alert } from './schemas/alert.schema';
import { CreateAlertDto } from './dto/create-alert.dto';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { KAFKA_TOPICS } from '../kafka/kafka-topics.constants';
import { EventType } from '../common/events/event-types';

@Injectable()
export class AlertsService {
  constructor(
    @InjectModel(Alert.name)
    private alertModel: Model<Alert>,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  async create(createAlertDto: CreateAlertDto) {
    const alert = new this.alertModel(createAlertDto);
    const savedAlert = await alert.save();

    await this.kafkaProducer.emit(
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

    return savedAlert;
  }

  async findAll() {
    return this.alertModel.find().sort({ createdAt: -1 });
  }

  async findBySensor(sensorId: string) {
    return this.alertModel.find({ sensorId }).sort({ createdAt: -1 }).exec();
  }
}