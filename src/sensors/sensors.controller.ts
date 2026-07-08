import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiReadErrors,
  ApiResourceReadErrors,
} from '../common/decorators/api-standard-errors.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedSensorDevicesResponseDto, PaginatedSensorReadingsResponseDto } from '../common/dto/paginated-response.dto';
import { ListSensorDevicesQueryDto } from './dto/list-sensor-devices-query.dto';
import { SensorsService } from './sensors.service';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';
import { ApiInternalKeyRequired } from '../alerts/decorators/api-internal-key.decorator';

@ApiTags('Sensors')
@Controller('sensors')
@UseGuards(InternalApiKeyGuard)
@ApiInternalKeyRequired()
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

  @Get('devices')
  @ApiOperation({
    summary: 'Listar dispositivos (sensores) disponibles',
    description:
      'Catálogo paginado de sensores distintos con al menos una lectura en P08. ' +
      'Pensado para integraciones (p. ej. P01) que necesitan seleccionar `sensorId`, `assetId` y `sensorType` al vincular un dispositivo. ' +
      'Parámetros opcionales: `page`, `limit`, `sensorType`, `search` (coincidencia parcial en sensorId).',
  })
  @ApiOkResponse({
    description: 'Dispositivos ordenados por última lectura recibida',
    type: PaginatedSensorDevicesResponseDto,
  })
  @ApiReadErrors()
  findDevices(@Query() query: ListSensorDevicesQueryDto) {
    return this.sensorsService.findDevices(query);
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
