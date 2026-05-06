import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateSensorReadingDto } from './dto/create-sensor-reading.dto';
import { SensorsService } from './sensors.service';

@ApiTags('Sensors')
@Controller('sensors')
export class SensorsController {
    constructor(private readonly sensorsService: SensorsService) {}

    @Get()
    @ApiOperation({ summary: 'Listar todas las lecturas' })
    findAll() {
        return this.sensorsService.findAll();
    }

    @Get('latest')
    @ApiOperation({ summary: 'Obtener última lectura registrada' })
    findLatest() {
        return this.sensorsService.findLatest();
    }

    @Get('sensor/:sensorId')
    @ApiOperation({ summary: 'Obtener lecturas por sensor' })
    findBySensor(@Param('sensorId') sensorId: string) {
        return this.sensorsService.findBySensor(sensorId);
    }

    @Get('alerts')
    @ApiOperation({ summary: 'Obtener lecturas con alerta' })
    findAlerts() {
        return this.sensorsService.findAlerts();
    }
}