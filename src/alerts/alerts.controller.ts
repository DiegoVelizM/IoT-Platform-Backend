import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@ApiTags('Alerts')
@Controller('alerts')
export class AlertsController {

    constructor(
        private readonly alertsService: AlertsService,
    ) {}

    @Post()
    @ApiOperation({ summary: 'Crear alerta' })
    create(@Body() createAlertDto: CreateAlertDto) {
        return this.alertsService.create(createAlertDto);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener alertas' })
    findAll() {
        return this.alertsService.findAll();
    }
}