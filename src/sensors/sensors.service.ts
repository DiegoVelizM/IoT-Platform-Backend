import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSensorReadingDto } from './dto/create-sensor-reading.dto';
import { SensorReading } from './schemas/sensor-reading.schema';

@Injectable()
export class SensorsService {
    constructor(
        @InjectModel(SensorReading.name)
        private readonly sensorReadingModel: Model<SensorReading>,
    ) {}

    async create(createSensorReadingDto: CreateSensorReadingDto) {
        const alert =
        createSensorReadingDto.gasLevel > 50 ||
        createSensorReadingDto.temperature > 45 ||
        createSensorReadingDto.batteryLevel < 20;

    const reading = new this.sensorReadingModel({
        ...createSensorReadingDto,
        alert,
    });

    return reading.save();
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

    async findAlerts() {
        return this.sensorReadingModel
            .find({ alert: true })
            .sort({ createdAt: -1 })
            .exec();
    }
}