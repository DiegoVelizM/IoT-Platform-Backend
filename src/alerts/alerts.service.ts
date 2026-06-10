import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Alert } from './schemas/alert.schema';
import { CreateAlertDto } from './dto/create-alert.dto';

@Injectable()
export class AlertsService {
  constructor(
    @InjectModel(Alert.name)
    private alertModel: Model<Alert>,
  ) {}

  async create(createAlertDto: CreateAlertDto) {
    const alert = new this.alertModel(createAlertDto);

    return alert.save();
  }

  async findAll() {
    return this.alertModel.find().sort({ createdAt: -1 });
  }

  async findBySensor(sensorId: string) {
    return this.alertModel.find({ sensorId }).sort({ createdAt: -1 }).exec();
  }

  async countActiveCriticalByAsset(assetId: string) {
    return this.alertModel
      .countDocuments({ assetId, severity: 'critical', resolved: false })
      .exec();
  }
}
