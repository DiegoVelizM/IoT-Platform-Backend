import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSensorReadingDto } from './dto/create-sensor-reading.dto';
import { SensorReading } from './schemas/sensor-reading.schema';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class SensorsService {
    constructor(
        @InjectModel(SensorReading.name)
        private sensorReadingModel: Model<SensorReading>,
        private readonly alertsService: AlertsService,
    ) {}

    async create(createSensorReadingDto: CreateSensorReadingDto) {

        const reading = new this.sensorReadingModel({
            ...createSensorReadingDto,
        });
        
        const saveReading = await reading.save();

        await this.generateAlertsFromTelemetry(createSensorReadingDto);

        return saveReading;
    }

    private async generateAlertsFromTelemetry(data: CreateSensorReadingDto) {
        if (data.batteryLevel < 20) {
            await this.alertsService.create({
                sensorId: data.sensorId,
                type: 'low_battery',
                severity: data.batteryLevel < 10 ? 'critical' : 'warning',
                message: `Battery level is low: ${data.batteryLevel}%`,
                resolved: false,
            });
        }

        if (data.temperature > 40) {
            await this.alertsService.create({
                sensorId: data.sensorId,
                type: 'temperature_out_of_range',
                severity: data.temperature > 50 ? 'critical' : 'warning',
                message: `Temperature exceeded threshold: ${data.temperature}°C`,
                resolved: false,
            });
        }

        if (data.gasLevel > 70) {
            await this.alertsService.create({
                sensorId: data.sensorId,
                type: 'gas_critical',
                severity: data.gasLevel > 85 ? 'critical' : 'warning',
                message: `Gas level exceeded threshold: ${data.gasLevel}`,
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