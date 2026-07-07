import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConnectionStatus,
  MedicalSensorType,
} from './create-sensor-reading.dto';

export class SensorReadingResponseDto {
  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d1' })
  _id!: string;

  @ApiProperty({ example: 'OXI-001' })
  sensorId!: string;

  @ApiProperty({ example: 'PATIENT-001' })
  assetId!: string;

  @ApiProperty({ enum: MedicalSensorType, example: MedicalSensorType.PULSE_OXIMETER })
  sensorType!: MedicalSensorType;

  @ApiPropertyOptional({ example: 85 })
  batteryLevel?: number;

  @ApiPropertyOptional({ enum: ConnectionStatus, example: ConnectionStatus.CONNECTED })
  connectionStatus?: ConnectionStatus;

  @ApiPropertyOptional({ example: 5.4 })
  temperature?: number;

  @ApiPropertyOptional({ example: 145 })
  glucoseLevel?: number;

  @ApiPropertyOptional({ example: 96 })
  oxygenSaturation?: number;

  @ApiPropertyOptional({ example: 82 })
  heartRate?: number;

  @ApiPropertyOptional({ example: 120 })
  systolicPressure?: number;

  @ApiPropertyOptional({ example: 80 })
  diastolicPressure?: number;

  @ApiProperty({ example: '2026-07-04T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-07-04T12:00:00.000Z' })
  updatedAt!: string;
}
