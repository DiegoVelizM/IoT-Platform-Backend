import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiReadErrors,
  ApiResourceReadErrors,
  ApiWriteErrors,
} from '../common/decorators/api-standard-errors.decorator';
import { CreateSensorReadingDto } from '../sensors/dto/create-sensor-reading.dto';
import { ApiSimulationKeyRequired } from './decorators/api-simulation-key.decorator';
import { DemoTelemetryService } from './demo-telemetry.service';
import {
  DemoScenarioSummaryDto,
  DemoTelemetryResultDto,
} from './dto/demo-telemetry.dto';
import { RunDemoScenarioDto } from './dto/run-demo-scenario.dto';
import { SimulationApiKeyGuard } from './guards/simulation-api-key.guard';

@ApiTags('Simulation Demo')
@Controller('simulation/demo')
export class DemoTelemetryController {
  constructor(private readonly demoTelemetryService: DemoTelemetryService) {}

  @Get('scenarios')
  @ApiOperation({
    summary: 'Catálogo de escenarios para demostración',
    description:
      'Lista lecturas predefinidas que generan alertas o resoluciones conocidas. ' +
      'Pensado para la demostración de cátedra sin depender de la simulación automática.',
  })
  @ApiOkResponse({
    description: 'Escenarios disponibles con telemetría esperada e integraciones',
    type: [DemoScenarioSummaryDto],
  })
  @ApiReadErrors()
  listScenarios() {
    return this.demoTelemetryService.listScenarios();
  }

  @Post('scenarios/:scenarioId/run')
  @UseGuards(SimulationApiKeyGuard)
  @ApiSimulationKeyRequired()
  @ApiOperation({
    summary: 'Ejecutar un escenario de demostración',
    description:
      'Envía la telemetría del escenario al flujo completo (MongoDB, Kafka, P09, P11, P06). ' +
      'Requiere header X-Simulation-Key. Opcionalmente puede sobreescribir sensorId/assetId.',
  })
  @ApiParam({
    name: 'scenarioId',
    example: 'low-battery-warning',
    description: 'ID del escenario (ver GET /simulation/demo/scenarios)',
  })
  @ApiBody({ required: false, type: RunDemoScenarioDto })
  @ApiCreatedResponse({
    description: 'Telemetría procesada con efectos esperados documentados',
    type: DemoTelemetryResultDto,
  })
  @ApiResourceReadErrors()
  @ApiWriteErrors()
  runScenario(
    @Param('scenarioId') scenarioId: string,
    @Body() body?: RunDemoScenarioDto,
  ) {
    return this.demoTelemetryService.runScenario(scenarioId, body);
  }

  @Post('telemetry')
  @UseGuards(SimulationApiKeyGuard)
  @ApiSimulationKeyRequired()
  @ApiOperation({
    summary: 'Enviar telemetría personalizada (demo)',
    description:
      'Igual que POST /telemetry pero protegido con X-Simulation-Key y con respuesta enriquecida ' +
      'para la demostración (efectos esperados e integraciones).',
  })
  @ApiBody({
    type: CreateSensorReadingDto,
    examples: {
      alertBattery: {
        summary: 'Alerta batería baja manual',
        value: {
          sensorId: 'OXI-DEMO-001',
          assetId: 'PATIENT-001',
          sensorType: 'pulse_oximeter',
          batteryLevel: 12,
          connectionStatus: 'connected',
          oxygenSaturation: 96,
          heartRate: 80,
        },
      },
      recovery: {
        summary: 'Resolver alertas del sensor',
        value: {
          sensorId: 'OXI-DEMO-001',
          assetId: 'PATIENT-001',
          sensorType: 'pulse_oximeter',
          batteryLevel: 95,
          connectionStatus: 'connected',
          oxygenSaturation: 98,
          heartRate: 72,
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Telemetría procesada con guía de integración',
    type: DemoTelemetryResultDto,
  })
  @ApiWriteErrors()
  submitCustomTelemetry(@Body() body: CreateSensorReadingDto) {
    return this.demoTelemetryService.submitCustomTelemetry(body);
  }
}
