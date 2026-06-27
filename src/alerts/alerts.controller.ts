import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiReadErrors, ApiWriteErrors } from '../common/decorators/api-standard-errors.decorator';
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
      'Si Kafka falla, la alerta se guarda igualmente; el error de publicación queda en logs.',
  })
  @ApiCreatedResponse({ description: 'Alerta creada correctamente', type: CreateAlertDto })
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
  @ApiReadErrors()
  findBySensor(@Param('sensorId') sensorId: string) {
    return this.alertsService.findBySensor(sensorId);
  }
}