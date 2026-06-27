import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiReadErrors,
  ApiResourceReadErrors,
  ApiWriteErrors,
} from '../common/decorators/api-standard-errors.decorator';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@ApiTags('Alerts')
@Controller('alerts')
export class AlertsController {

  constructor(
      private readonly alertsService: AlertsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Crear alerta',
    description:
      'Persiste la alerta en MongoDB y publica el evento `alert_generated` en Kafka. ' +
      'Si Kafka falla, la alerta se guarda y la respuesta incluye `warnings` con código `KAFKA_PUBLISH_FAILED`.',
  })
  @ApiCreatedResponse({
    description:
      'Alerta creada correctamente. Si Kafka falla, incluye array `warnings` con códigos KAFKA_PUBLISH_FAILED o KAFKA_CONNECTION_FAILED',
    type: CreateAlertDto,
  })
  @ApiWriteErrors()
  create(@Body() createAlertDto: CreateAlertDto) {
      return this.alertsService.create(createAlertDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener alertas' })
  @ApiOkResponse({ description: 'Lista de alertas ordenadas por fecha de creación' })
  @ApiReadErrors()
  findAll() {
      return this.alertsService.findAll();
  }

  @Get('sensor/:sensorId')
  @ApiOperation({ summary: 'Obtener alertas por sensor' })
  @ApiOkResponse({ description: 'Alertas del sensor indicado' })
  @ApiResourceReadErrors()
  findBySensor(@Param('sensorId') sensorId: string) {
    return this.alertsService.findBySensor(sensorId);
  }
}