import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConnectionStatus,
  MedicalSensorType,
} from './create-sensor-reading.dto';

export class SensorDeviceResponseDto {
  @ApiProperty({ example: 'OXI-001' })
  sensorId!: string;

  @ApiProperty({ example: 'PATIENT-001' })
  assetId!: string;

  @ApiProperty({
    enum: MedicalSensorType,
    example: MedicalSensorType.PULSE_OXIMETER,
  })
  sensorType!: MedicalSensorType;

  @ApiPropertyOptional({ example: 85 })
  batteryLevel?: number;

  @ApiPropertyOptional({
    enum: ConnectionStatus,
    example: ConnectionStatus.CONNECTED,
  })
  connectionStatus?: ConnectionStatus;

  @ApiProperty({
    example: '2026-07-04T12:00:00.000Z',
    description: 'Fecha de la última lectura recibida para este sensor',
  })
  lastReadingAt!: string;
}
