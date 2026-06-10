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

export class SimulatedSensorFrequencyDto {
  @ApiPropertyOptional({
    example: 'sensor-sim-1',
    description: 'ID del sensor simulado',
  })
  @IsString()
  sensorId!: string;

  @ApiPropertyOptional({
    example: 1000,
    description: 'Frecuencia de emisión del sensor en milisegundos',
  })
  @IsInt()
  @Min(1000)
  @Max(60000)
  frequencyMs!: number;
}

export class StartSimulationDto {
  @ApiPropertyOptional({
    example: 3,
    description: 'Cantidad de sensores simulados a iniciar',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Frecuencia global de emisión en milisegundos',
  })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(60000)
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
