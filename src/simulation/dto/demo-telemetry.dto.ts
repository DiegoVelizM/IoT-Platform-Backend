import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OperationWarningDto } from '../../common/dto/operation-warning.dto';
import { SensorReadingResponseDto } from '../../sensors/dto/sensor-reading-response.dto';
import { CreateSensorReadingDto } from '../../sensors/dto/create-sensor-reading.dto';

export class DemoScenarioIntegrationsDto {
  @ApiProperty({
    example: ['telemetry_received', 'alert_generated'],
    type: [String],
  })
  kafka!: string[];

  @ApiProperty({ example: 'Evento de telemetría y alerta' })
  p09!: string;

  @ApiProperty({ example: 'alert_generated (warning/critical)' })
  p11!: string;

  @ApiProperty({
    example: 'Email solo si la alerta es nueva (dedup si ya estaba abierta)',
  })
  p06!: string;
}

export class DemoScenarioExpectedAlertDto {
  @ApiProperty({ example: 'low_battery' })
  type!: string;

  @ApiProperty({ enum: ['warning', 'critical'], example: 'warning' })
  severity!: 'warning' | 'critical';

  @ApiProperty({
    enum: ['create', 'resolve', 'dedup_if_open'],
    example: 'create',
  })
  action!: 'create' | 'resolve' | 'dedup_if_open';
}

export class DemoScenarioSummaryDto {
  @ApiProperty({ example: 'low-battery-warning' })
  id!: string;

  @ApiProperty({ example: 'Batería baja (warning)' })
  title!: string;

  @ApiProperty({
    example:
      'Dispara alerta low_battery con severidad warning. Útil para demostrar P11 y P06.',
  })
  description!: string;

  @ApiProperty({ enum: ['alert', 'recovery'], example: 'alert' })
  category!: 'alert' | 'recovery';

  @ApiProperty({ type: DemoScenarioExpectedAlertDto })
  expectedAlert!: DemoScenarioExpectedAlertDto;

  @ApiProperty({ type: DemoScenarioIntegrationsDto })
  integrations!: DemoScenarioIntegrationsDto;

  @ApiProperty({ type: CreateSensorReadingDto })
  reading!: CreateSensorReadingDto;
}

export class DemoTelemetryResultDto {
  @ApiPropertyOptional({ example: 'low-battery-warning' })
  scenarioId?: string;

  @ApiPropertyOptional({ example: 'Batería baja (warning)' })
  scenarioTitle?: string;

  @ApiProperty({ type: CreateSensorReadingDto })
  telemetrySent!: CreateSensorReadingDto;

  @ApiProperty({ type: SensorReadingResponseDto })
  savedReading!: SensorReadingResponseDto;

  @ApiProperty({ type: DemoScenarioExpectedAlertDto })
  expectedEffects!: DemoScenarioExpectedAlertDto;

  @ApiProperty({ type: DemoScenarioIntegrationsDto })
  integrations!: DemoScenarioIntegrationsDto;

  @ApiProperty({
    example:
      'Revise logs de P08 (Alert generated / Notifying P11) y el panel de P11. Si la alerta ya estaba abierta, no se re-notifica a P06.',
  })
  demoHint!: string;

  @ApiPropertyOptional({ type: [OperationWarningDto] })
  warnings?: OperationWarningDto[];
}
