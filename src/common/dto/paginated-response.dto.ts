import { ApiProperty } from '@nestjs/swagger';
import { AlertResponseDto } from '../../alerts/dto/alert-response.dto';
import { SensorDeviceResponseDto } from '../../sensors/dto/sensor-device-response.dto';
import { SensorReadingResponseDto } from '../../sensors/dto/sensor-reading-response.dto';

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export class PaginatedSensorReadingsResponseDto implements PaginatedResponse<SensorReadingResponseDto> {
  @ApiProperty({ type: SensorReadingResponseDto, isArray: true })
  data!: SensorReadingResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 25 })
  limit!: number;

  @ApiProperty({ example: 120 })
  total!: number;
}

export class PaginatedSensorDevicesResponseDto implements PaginatedResponse<SensorDeviceResponseDto> {
  @ApiProperty({ type: SensorDeviceResponseDto, isArray: true })
  data!: SensorDeviceResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 25 })
  limit!: number;

  @ApiProperty({ example: 120 })
  total!: number;
}

export class PaginatedAlertsResponseDto implements PaginatedResponse<AlertResponseDto> {
  @ApiProperty({ type: AlertResponseDto, isArray: true })
  data!: AlertResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 25 })
  limit!: number;

  @ApiProperty({ example: 120 })
  total!: number;
}
