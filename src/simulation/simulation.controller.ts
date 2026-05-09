import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SimulationService } from './simulation.service';

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
  startSimulation() {
    return this.simulationService.startSimulation();
  }

  @Post('stop')
  @ApiOperation({ summary: 'Detener simulación automática' })
  stopSimulation() {
    return this.simulationService.stopSimulation();
  }
}