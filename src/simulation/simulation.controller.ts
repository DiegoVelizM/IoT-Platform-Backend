import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { GenerateSensorsQueryDto } from './dto/generate-sensors-query.dto';
import { SimulationService } from './simulation.service';
import { StartSimulationDto } from './dto/start-simulation.dto';

@ApiTags('Simulation')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('simulation')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Get('sensors')
  @ApiOperation({ summary: 'Generar sensores simulados' })
  generateSensors(@Query() query: GenerateSensorsQueryDto) {
    return this.simulationService.generateSensors(query.quantity);
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
