import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SensorsService } from './sensors.service';

@ApiTags('Sensors')
@Controller('sensors')
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar los sensores únicos y su estado online/offline',
  })
  getSensors() {
    return this.sensorsService.getSensorsList();
  }

  @Get('latest')
  @ApiOperation({ summary: 'Obtener última lectura registrada' })
  findLatest() {
    return this.sensorsService.findLatest();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un sensor' })
  getSensorDetail(@Param('id') sensorId: string) {
    return this.sensorsService.getSensorDetail(sensorId);
  }

  @Get('sensor/:sensorId')
  @ApiOperation({ summary: 'Obtener lecturas por sensor' })
  findBySensor(@Param('sensorId') sensorId: string) {
    return this.sensorsService.findBySensor(sensorId);
  }
}
