import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiReadErrors, ApiWriteErrors } from '../common/decorators/api-standard-errors.decorator';
import { SimulationService } from './simulation.service';
import { StartSimulationDto } from './dto/start-simulation.dto';

@ApiTags('Simulation')
@Controller('simulation')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Get('sensors')
  @ApiOperation({ summary: 'Generar sensores simulados' })
  @ApiOkResponse({ description: 'Lista de sensores médicos simulados predefinidos' })
  @ApiReadErrors()
  @ApiQuery({
    name: 'quantity',
    required: false,
    example: 4,
    description: 'Cantidad de sensores simulados a generar',
  })
  generateSensors(@Query('quantity') quantity?: string) {
    const parsedQuantity = quantity ? Number(quantity) : 5;
    return this.simulationService.generateSensors(parsedQuantity);
  }

  @Post('start')
  @ApiOperation({
    summary: 'Iniciar simulación automática',
    description:
      'Emite lecturas periódicas hacia el flujo de telemetría. Si ya hay una simulación activa, responde 200 con mensaje informativo.',
  })
  @ApiOkResponse({ description: 'Simulación iniciada o mensaje si ya estaba en ejecución' })
  @ApiWriteErrors()
  @ApiBody({
    required: false,
    type: StartSimulationDto,
    examples: {
      globalFrequency: {
        summary: 'Frecuencia global',
        value: {
          frequencyMs: 5000,
        },
      },
      multipleFrequencies: {
        summary: 'Múltiples frecuencias médicas',
        value: {
          sensors: [
            { sensorId: 'OXI-001', frequencyMs: 1000 },
            { sensorId: 'GLUCO-001', frequencyMs: 3000 },
            {sensorId: 'THERMO-001', frequencyMs: 5000 },
            { sensorId: 'BP-001', frequencyMs: 10000 },
          ],
        },
      },
    },
  })
  startSimulation(@Body() body?: StartSimulationDto) {
    return this.simulationService.startSimulation(body);
  }

  @Post('stop')
  @ApiOperation({ summary: 'Detener simulación automática' })
  @ApiOkResponse({ description: 'Simulación detenida correctamente' })
  @ApiReadErrors()
  stopSimulation() {
    return this.simulationService.stopSimulation();
  }
}