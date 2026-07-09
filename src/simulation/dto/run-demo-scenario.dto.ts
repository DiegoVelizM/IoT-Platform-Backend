import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RunDemoScenarioDto {
  @ApiPropertyOptional({
    example: 'OXI-DEMO-001',
    description:
      'Opcional. Reemplaza el sensorId del escenario para pruebas controladas.',
  })
  @IsOptional()
  @IsString()
  sensorId?: string;

  @ApiPropertyOptional({
    example: 'PATIENT-DEMO-001',
    description: 'Opcional. Reemplaza el assetId del escenario.',
  })
  @IsOptional()
  @IsString()
  assetId?: string;
}
