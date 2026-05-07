import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { Alert } from './schemas/alert.schema';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  create(@Body() createAlertDto: CreateAlertDto): Promise<Alert> {
    return this.alertsService.create(createAlertDto);
  }

  @Get()
  findAll(): Promise<Alert[]> {
    return this.alertsService.findAll();
  }

  @Get('sensor/:sensorId')
  findBySensor(@Param('sensorId') sensorId: string): Promise<Alert[]> {
    return this.alertsService.findBySensor(sensorId);
  }
}