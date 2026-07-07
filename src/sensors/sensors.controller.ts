import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiReadErrors,
  ApiResourceReadErrors,
} from '../common/decorators/api-standard-errors.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedSensorReadingsResponseDto } from '../common/dto/paginated-response.dto';
import { SensorsService } from './sensors.service';

@ApiTags('Sensors')
@Controller('sensors')
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar lecturas',
    description: 'Paginado. Parámetros opcionales: `page` (default 1), `limit` (default 25, máx 100).',
  })
  @ApiOkResponse({
    description: 'Lecturas paginadas ordenadas por fecha de creación',
    type: PaginatedSensorReadingsResponseDto,
  })
  @ApiReadErrors()
  findAll(@Query() query: PaginationQueryDto) {
    return this.sensorsService.findAll(query);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Obtener última lectura registrada' })
  @ApiOkResponse({ description: 'Última lectura registrada' })
  @ApiResourceReadErrors()
  findLatest() {
    return this.sensorsService.findLatest();
  }

  @Get('sensor/:sensorId')
  @ApiOperation({
    summary: 'Obtener lecturas por sensor',
    description: 'Paginado. Devuelve 404 si el sensor no tiene lecturas.',
  })
  @ApiOkResponse({
    description: 'Lecturas del sensor indicado',
    type: PaginatedSensorReadingsResponseDto,
  })
  @ApiResourceReadErrors()
  findBySensor(
    @Param('sensorId') sensorId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.sensorsService.findBySensor(sensorId, query);
  }
}
