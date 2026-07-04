import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Intervalo máximo entre lecturas por sensor (2 minutos). */
export const MAX_SIMULATION_FREQUENCY_MS = 120_000;

export class SimulatedSensorFrequencyDto {
  @ApiPropertyOptional({
    example: 'OXI-001',
    description: 'ID del sensor médico simulado',
  })
  @IsString()
  sensorId!: string;

  @ApiPropertyOptional({
    example: 1000,
    description: 'Frecuencia de emisión del sensor en milisegundos (1000–120000)',
  })
  @IsInt()
  @Min(1000)
  @Max(MAX_SIMULATION_FREQUENCY_MS)
  frequencyMs!: number;
}

export class StartSimulationDto {
  @ApiPropertyOptional({
    example: 4,
    description: 'Cantidad de sensores médicos simulados a iniciar',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity?: number;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Frecuencia global de emisión en milisegundos (1000–120000)',
  })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(MAX_SIMULATION_FREQUENCY_MS)
  frequencyMs?: number;

  @ApiPropertyOptional({
    type: [SimulatedSensorFrequencyDto],
    description: 'Configuración individual de frecuencia por sensor',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SimulatedSensorFrequencyDto)
  sensors?: SimulatedSensorFrequencyDto[];
}