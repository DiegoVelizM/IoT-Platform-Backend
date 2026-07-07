import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Alert } from './schemas/alert.schema';
import { CreateAlertDto } from './dto/create-alert.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

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

  async findAll(query: PaginationQueryDto) {
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

  async findBySensor(sensorId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.alertModel
        .find({ sensorId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.alertModel.countDocuments({ sensorId }).exec(),
    ]);

    return { data, page, limit, total };
  }
}
