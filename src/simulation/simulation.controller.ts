import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SimulationService } from './simulation.service';
import { StartSimulationDto } from './dto/start-simulation.dto';

@ApiTags('Simulation')
@Controller('simulation')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Get('sensors')
  @ApiOperation({ summary: 'Generar sensores simulados' })
  @ApiQuery({
    name: 'quantity',
    required: false,
    example: 5,
    description: 'Cantidad de sensores simulados a generar',
  })
  generateSensors(@Query('quantity') quantity?: string) {
    const parsedQuantity = quantity ? Number(quantity) : 5;
    return this.simulationService.generateSensors(parsedQuantity);
  }

  @Post('start')
  @ApiOperation({ summary: 'Iniciar simulación automática' })
  @ApiBody({
    required: false,
    type: StartSimulationDto,
    examples: {
      globalFrequency: {
        summary: 'Frecuencia global',
        value: {
          quantity: 3,
          frequencyMs: 5000,
        },
      },
      multipleFrequencies: {
        summary: 'Múltiples frecuencias',
        value: {
          sensors: [
            { sensorId: 'sensor-sim-1', frequencyMs: 1000 },
            { sensorId: 'sensor-sim-2', frequencyMs: 3000 },
            { sensorId: 'sensor-sim-3', frequencyMs: 5000 },
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
  stopSimulation() {
    return this.simulationService.stopSimulation();
  }
}