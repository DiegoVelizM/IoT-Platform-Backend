import { Injectable } from '@nestjs/common';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';
import { CreateSensorReadingDto } from '../sensors/dto/create-sensor-reading.dto';
import { SensorsService } from '../sensors/sensors.service';
import {
  buildScenarioReading,
  DEMO_SCENARIOS,
  DemoScenarioDefinition,
  findDemoScenarioById,
} from './demo-scenarios';
import { DemoTelemetryResultDto } from './dto/demo-telemetry.dto';
import { RunDemoScenarioDto } from './dto/run-demo-scenario.dto';

@Injectable()
export class DemoTelemetryService {
  constructor(private readonly sensorsService: SensorsService) {}

  listScenarios(): DemoScenarioDefinition[] {
    return DEMO_SCENARIOS;
  }

  async runScenario(
    scenarioId: string,
    overrides?: RunDemoScenarioDto,
  ): Promise<DemoTelemetryResultDto> {
    const scenario = findDemoScenarioById(scenarioId);

    if (!scenario) {
      throw new ResourceNotFoundException('Demo scenario', scenarioId);
    }

    const reading = buildScenarioReading(scenario, overrides);

    return this.submitTelemetry(scenario, reading);
  }

  async submitCustomTelemetry(
    reading: CreateSensorReadingDto,
  ): Promise<DemoTelemetryResultDto> {
    const syntheticScenario: DemoScenarioDefinition = {
      id: 'custom',
      title: 'Telemetría personalizada',
      description:
        'Lectura enviada manualmente. Revise umbrales en README para anticipar alertas.',
      category: 'alert',
      expectedAlert: {
        type: 'según umbrales evaluados',
        severity: 'warning',
        action: 'dedup_if_open',
      },
      integrations: {
        kafka: ['telemetry_received', 'alert_generated (si aplica)'],
        p09: 'Telemetría y alerta si corresponde',
        p11: 'alert_generated o alert_resolved según el caso',
        p06: 'Email solo al crear alerta nueva warning/critical',
      },
      reading,
    };

    return this.submitTelemetry(syntheticScenario, reading);
  }

  private async submitTelemetry(
    scenario: DemoScenarioDefinition,
    reading: CreateSensorReadingDto,
  ): Promise<DemoTelemetryResultDto> {
    const savedReading = await this.sensorsService.create(reading);
    const { warnings, ...readingData } = savedReading as CreateSensorReadingDto & {
      warnings?: DemoTelemetryResultDto['warnings'];
    };

    return {
      scenarioId: scenario.id === 'custom' ? undefined : scenario.id,
      scenarioTitle: scenario.title,
      telemetrySent: reading,
      savedReading: readingData as DemoTelemetryResultDto['savedReading'],
      expectedEffects: scenario.expectedAlert,
      integrations: scenario.integrations,
      demoHint: this.buildDemoHint(scenario),
      ...(warnings?.length ? { warnings } : {}),
    };
  }

  private buildDemoHint(scenario: DemoScenarioDefinition): string {
    if (scenario.category === 'recovery') {
      return 'Busque en logs P08: "Alert resolved in MongoDB" y "Notifying P11 of alert resolution". P06 no envía email en resolución.';
    }

    return 'Busque en logs P08: "Alert generated", "Sending alert_generated to incidents API" y "Preparing notification" (P06). Si la alerta ya estaba abierta, verá dedup sin nuevo email.';
  }
}
