import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateTemperatureDto } from '../../sensors/dto/create-temperature.dto';
import { CreateGlucoseDto } from '../../sensors/dto/create-glucose.dto';
import { CreateHeartRateDto } from '../../sensors/dto/create-heart-rate.dto';
import { CreateBloodPressureDto } from '../../sensors/dto/create-blood-pressure.dto';
import { CreateEnvironmentalDto } from '../../sensors/dto/create-environmental.dto';
import { CreateSensorReadingBaseDto } from '../../sensors/dto/create-sensor-reading-base.dto';

const map: Record<string, any> = {
  temperature: CreateTemperatureDto,
  glucose: CreateGlucoseDto,
  heart_rate: CreateHeartRateDto,
  blood_pressure: CreateBloodPressureDto,
  environmental: CreateEnvironmentalDto,
};

@Injectable()
export class SensorReadingValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (typeof value !== 'object' || value === null) {
      throw new BadRequestException('Invalid request body');
    }

    value.sensor_id = value.sensor_id || value.sensorId;
    value.asset_id = value.asset_id || value.assetId;
    value.sensor_type =
      value.sensor_type ||
      value.sensorType ||
      value.type ||
      inferSensorType(value);

    const Candidate = value.sensor_type
      ? map[value.sensor_type] || CreateSensorReadingBaseDto
      : CreateSensorReadingBaseDto;

    const dto = plainToInstance(Candidate, value);
    const errors = validateSync(dto as object, {
      whitelist: true,
      forbidNonWhitelisted: false,
    });
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return dto;
  }
}

function inferSensorType(value: any) {
  if (value.temperature !== undefined) return 'temperature';
  if (value.glucose !== undefined) return 'glucose';
  if (value.heart_rate !== undefined) return 'heart_rate';
  if (value.systolic !== undefined && value.diastolic !== undefined)
    return 'blood_pressure';
  return 'environmental';
}
