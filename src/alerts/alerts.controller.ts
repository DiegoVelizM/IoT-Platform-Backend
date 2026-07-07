import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiReadErrors,
  ApiResourceReadErrors,
  ApiWriteErrors,
} from '../common/decorators/api-standard-errors.decorator';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { ApiInternalKeyRequired } from './decorators/api-internal-key.decorator';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@ApiTags('Alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @UseGuards(InternalApiKeyGuard)
  @ApiInternalKeyRequired()
  @ApiOperation({
    summary: 'Crear alerta manualmente',
    description:
      'Requiere header X-Internal-Api-Key. Las alertas automáticas por umbrales se generan vía telemetría sin este endpoint. ' +
      'Persiste en MongoDB, publica `alert_generated` en Kafka y reenvía a P11 si aplica.',
  })
  @ApiCreatedResponse({
    description:
      'Alerta creada correctamente. Si Kafka falla, incluye array `warnings`.',
    type: CreateAlertDto,
  })
  @ApiWriteErrors()
  create(@Body() createAlertDto: CreateAlertDto) {
    return this.alertsService.create(createAlertDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener alertas',
    description: 'Paginado. Parámetros opcionales: `page` (default 1), `limit` (default 25, máx 100).',
  })
  @ApiOkResponse({
    description: 'Alertas paginadas ordenadas por fecha de creación',
    type: PaginatedResponseDto,
  })
  @ApiReadErrors()
  findAll(@Query() query: PaginationQueryDto) {
    return this.alertsService.findAll(query);
  }

  @Get('sensor/:sensorId')
  @ApiOperation({
    summary: 'Obtener alertas por sensor',
    description: 'Paginado. Devuelve 404 si el sensor no tiene alertas.',
  })
  @ApiOkResponse({
    description: 'Alertas del sensor indicado',
    type: PaginatedResponseDto,
  })
  @ApiResourceReadErrors()
  findBySensor(
    @Param('sensorId') sensorId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.alertsService.findBySensor(sensorId, query);
  }
}
