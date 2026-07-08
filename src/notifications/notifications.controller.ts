import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiReadErrors, ApiWriteErrors } from '../common/decorators/api-standard-errors.decorator';
import {
  FailedNotificationDto,
  CreateNotificationDto,
  NotificationResponseDto,
  RetryFailedNotificationsResponseDto,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  @ApiOperation({ summary: 'Enviar notificacion al Grupo 6' })
  @ApiBody({ type: CreateNotificationDto })
  @ApiCreatedResponse({ type: NotificationResponseDto })
  @ApiWriteErrors()
  async send(@Body() body: CreateNotificationDto) {
    const { recipient, ...alert } = body;
    return this.notificationsService.sendNotification(alert, recipient);
  }

  @Post('test')
  @ApiOperation({ summary: 'Enviar notificacion de prueba' })
  @ApiCreatedResponse({ type: NotificationResponseDto })
  @ApiWriteErrors()
  async sendTest() {
    return this.notificationsService.sendNotification(
      {
        sensorId: 'TEST-001',
        type: 'test_notification',
        severity: 'critical',
        message: 'Notificacion de prueba desde IoT Platform',
        channel: 'email',
        subject: 'Prueba de integracion Grupo 6',
        body: {
          email: '<p>Prueba de integracion de notificaciones</p>',
          sms: 'Prueba de integracion de notificaciones',
        },
      },
      {
        email: 'destinatario@ejemplo.com',
        telefono: '+56912345678',
      },
    );
  }

  @Get('failed')
  @ApiOperation({ summary: 'Listar notificaciones fallidas' })
  @ApiOkResponse({
    description: 'Lista de notificaciones pendientes de reintento',
    type: FailedNotificationDto,
    isArray: true,
  })
  @ApiReadErrors()
  async getFailed() {
    return this.notificationsService.getFailedNotifications();
  }

  @Post('retry-failed')
  @ApiOperation({ summary: 'Reintentar notificaciones fallidas' })
  @ApiCreatedResponse({
    description: 'Resultado del reintento de notificaciones fallidas',
    type: RetryFailedNotificationsResponseDto,
  })
  @ApiWriteErrors()
  async retryFailed() {
    return this.notificationsService.retryFailedNotifications();
  }
}
