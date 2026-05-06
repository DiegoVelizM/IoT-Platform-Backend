import { ApiProperty } from '@nestjs/swagger';
import { IsLatitude, IsLongitude, IsNumber, IsString, Max, Min } from 'class-validator';

export class CreateSensorReadingDto {
    @ApiProperty({ example: 'ESP32-001' })
    @IsString()
    sensorId!: string;

    @ApiProperty({ example: 'Sector A' })
    @IsString()
    location!: string;

    @ApiProperty({ example: 28.5 })
    @IsNumber()
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