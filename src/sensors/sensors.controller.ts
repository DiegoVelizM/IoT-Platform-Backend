import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiReadErrors } from '../common/decorators/api-standard-errors.decorator';
import { SensorsService } from './sensors.service';

@ApiTags('Sensors')
@Controller('sensors')
export class SensorsController {
    constructor(private readonly sensorsService: SensorsService) {}

    @Get()
    @ApiOperation({ summary: 'Listar todas las lecturas' })
    @ApiOkResponse({ description: 'Todas las lecturas ordenadas por fecha de creación' })
    @ApiReadErrors()
    findAll() {
        return this.sensorsService.findAll();
    }

    @Get('latest')
    @ApiOperation({ summary: 'Obtener última lectura registrada' })
    @ApiOkResponse({ description: 'Última lectura registrada, o null si no hay datos' })
    @ApiReadErrors()
    findLatest() {
        return this.sensorsService.findLatest();
    }

    @Get('sensor/:sensorId')
    @ApiOperation({ summary: 'Obtener lecturas por sensor' })
    @ApiOkResponse({ description: 'Lecturas del sensor indicado' })
    @ApiReadErrors()
    findBySensor(@Param('sensorId') sensorId: string) {
        return this.sensorsService.findBySensor(sensorId);
    }
}