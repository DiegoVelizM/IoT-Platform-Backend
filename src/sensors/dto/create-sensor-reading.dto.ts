import { ApiProperty } from '@nestjs/swagger';
import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsString,
  Max,
  Min,
  IsOptional,
} from 'class-validator';

export class CreateSensorReadingDto {
  @ApiProperty({ example: 'ESP32-001' })
  @IsString()
  sensorId!: string;

  @ApiProperty({ example: 'Sector A' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ example: 'temperature', required: false })
  @IsOptional()
  @IsString()
  sensorType?: string;

  @ApiProperty({ example: 'PATIENT-001', required: false })
  @IsOptional()
  @IsString()
  assetId?: string;

  @ApiProperty({ example: 28.5, required: false })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiProperty({ example: 60, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidity?: number;

  @ApiProperty({ example: 35, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  gasLevel?: number;

  @ApiProperty({ example: 87, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  batteryLevel?: number;

  @ApiProperty({ example: 85, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  battery?: number;

  @ApiProperty({ example: 80, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  signalStrength?: number;

  @ApiProperty({ example: -29.9533, required: false })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiProperty({ example: -71.3436, required: false })
  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
