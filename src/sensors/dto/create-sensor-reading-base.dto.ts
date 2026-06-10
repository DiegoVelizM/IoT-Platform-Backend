import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateSensorReadingBaseDto {
  @ApiProperty({ example: 'SENSOR-001' })
  @IsString()
  sensor_id!: string;

  @ApiProperty({ example: 'PATIENT-001' })
  @IsOptional()
  @IsString()
  asset_id?: string;

  @ApiProperty({ example: 'temperature' })
  @IsString()
  sensor_type!: string;

  @ApiProperty({ example: new Date().toISOString() })
  @IsOptional()
  @IsISO8601()
  timestamp?: string;
}
