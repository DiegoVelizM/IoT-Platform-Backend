import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum MedicalSensorType {
  THERMOMETER = 'thermometer',
  GLUCOMETER = 'glucometer',
  PULSE_OXIMETER = 'pulse_oximeter',
  SPHYGMOMANOMETER = 'sphygmomanometer',
}

export enum ConnectionStatus {
  CONNECTED = 'connected',
  OFFLINE = 'offline',
}

export class CreateSensorReadingDto {
  @ApiProperty({ example: 'OXI-001' })
  @IsString()
  sensorId!: string;

  @ApiProperty({
    example: 'PATIENT-001',
    description: 'Paciente, kit médico o activo asociado',
  })
  @IsString()
  assetId!: string;

  @ApiProperty({
    enum: MedicalSensorType,
    example: MedicalSensorType.PULSE_OXIMETER,
  })
  @IsEnum(MedicalSensorType)
  sensorType!: MedicalSensorType;

  @ApiPropertyOptional({ example: 85 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  batteryLevel?: number;

  @ApiPropertyOptional({
    enum: ConnectionStatus,
    example: ConnectionStatus.CONNECTED,
  })
  @IsOptional()
  @IsEnum(ConnectionStatus)
  connectionStatus?: ConnectionStatus;

  @ApiPropertyOptional({
    example: 5.4,
    description: 'Temperatura de insumo médico. Rango esperado simulado: 2°C a 8°C',
  })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ example: 145 })
  @IsOptional()
  @IsNumber()
  glucoseLevel?: number;

  @ApiPropertyOptional({ example: 96 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  oxygenSaturation?: number;

  @ApiPropertyOptional({ example: 82 })
  @IsOptional()
  @IsNumber()
  heartRate?: number;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsNumber()
  systolicPressure?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsNumber()
  diastolicPressure?: number;
}