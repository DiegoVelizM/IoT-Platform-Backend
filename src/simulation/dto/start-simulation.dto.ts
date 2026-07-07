import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  ArrayMaxSize,
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
    example: 5000,
    description: 'Frecuencia de emision del sensor en milisegundos',
  })
  @IsInt()
  @Min(5000)
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
  @Max(20)
  quantity?: number;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Frecuencia global de emision en milisegundos',
  })
  @IsOptional()
  @IsInt()
  @Min(5000)
  @Max(60000)
  frequencyMs?: number;

  @ApiPropertyOptional({
    type: [SimulatedSensorFrequencyDto],
    description: 'Configuracion individual de frecuencia por sensor',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SimulatedSensorFrequencyDto)
  sensors?: SimulatedSensorFrequencyDto[];
}
