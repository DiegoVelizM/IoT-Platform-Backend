import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Alert, AlertDocument } from './schemas/alert.schema';
import { CreateAlertDto } from './dto/create-alert.dto';

@Injectable()
export class AlertsService {
  constructor(@InjectModel(Alert.name) private alertModel: Model<AlertDocument>) {}

  create(createAlertDto: CreateAlertDto): Promise<Alert> {
    const createdAlert = new this.alertModel(createAlertDto);
    return createdAlert.save();
  }

  findAll(): Promise<Alert[]> {
    return this.alertModel.find().exec();
  }

  findBySensor(sensorId: string): Promise<Alert[]> {
    return this.alertModel.find({ sensorId }).exec();
  }
}