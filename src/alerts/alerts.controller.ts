import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@ApiTags('Alerts')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear alerta' })
  create(@Body() createAlertDto: CreateAlertDto) {
    return this.alertsService.create(createAlertDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener alertas' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.alertsService.findAll(query);
  }

  @Get('sensor/:sensorId')
  @ApiOperation({ summary: 'Obtener alertas por sensor' })
  findBySensor(
    @Param('sensorId') sensorId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.alertsService.findBySensor(sensorId, query);
  }
}
