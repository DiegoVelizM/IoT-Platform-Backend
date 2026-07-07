import { ApiProperty } from '@nestjs/swagger';
import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateSensorReadingDto {
  @ApiProperty({ example: 'ESP32-001' })
  @IsString()
  @Length(3, 64)
  @Matches(/^[A-Za-z0-9_-]+$/)
  sensorId!: string;

  @ApiProperty({ example: 'Sector A' })
  @IsString()
  @Length(1, 120)
  location!: string;

  @ApiProperty({ example: 28.5 })
  @IsNumber()
  @Min(-50)
  @Max(100)
  temperature!: number;

  @ApiProperty({ example: 60 })
  @IsNumber()
  @Min(0)
  @Max(100)
  humidity!: number;

  @ApiProperty({ example: 35 })
  @IsNumber()
  @Min(0)
  @Max(100)
  gasLevel!: number;

  @ApiProperty({ example: 87 })
  @IsNumber()
  @Min(0)
  @Max(100)
  batteryLevel!: number;

  @ApiProperty({ example: -29.9533 })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: -71.3436 })
  @IsLongitude()
  longitude!: number;
}
