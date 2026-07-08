import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios'; // Asegúrate de tener la dependencia instalada
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AxiosResponse, AxiosError } from 'axios'; // Para tipar la respuesta y el error
import {
  NotificationPayload,
  NotificationRecipient,
  NotificationResponse,
} from './interfaces/notification.interface';
import { FailedNotification } from './schemas/failed-notification.schema';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly maxRetries = 3;
  private readonly backoffDelaysMs = [1000, 2000, 4000];
  private readonly failedInMemory: Array<Record<string, unknown>> = [];

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectModel(FailedNotification.name)
    private readonly failedNotificationModel: Model<FailedNotification>,
  ) {
    const apiKey = this.configService.get<string>('NOTIFICATIONS_API_KEY', 'NOT_CONFIGURED');
    const apiUrl = this.configService.get<string>('NOTIFICATIONS_API_URL', 'NOT_CONFIGURED');
    this.logger.log(`NotificationsService initialized with API_URL: ${apiUrl}`);
    this.logger.log(`NotificationsService initialized with API_KEY: ${apiKey ? 'CONFIGURED' : 'NOT_CONFIGURED'}`);
  }

  async sendNotification(alert: any, recipientInfo?: any): Promise<NotificationResponse> {
    const payload = this.buildPayload(alert, recipientInfo);

    this.logger.log(
      `Preparing notification for sensor ${String(alert?.sensorId ?? 'unknown')} with channel ${payload.channel}`,
    );

    return this.sendPayloadWithRetry(payload, alert, true);
  }

  async getFailedNotifications() {
    return this.failedNotificationModel
      .find({ status: { $in: ['pending', 'retried'] } })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async retryFailedNotifications() {
    const failedNotifications = await this.failedNotificationModel
      .find({ status: { $in: ['pending', 'retried'] } })
      .sort({ createdAt: 1 })
      .exec();

    const results: NotificationResponse[] = [];

    for (const failed of failedNotifications) {
      this.logger.log(`Retrying failed notification ${failed.id}`);

      const result = await this.sendPayloadWithRetry(
        failed.payload,
        failed.alertSnapshot ?? {},
        false,
      );

      results.push(result);

      if (result.success) {
        failed.status = 'resolved';
      } else {
        failed.status = 'retried';
        failed.errorMessage = result.error?.message ?? failed.errorMessage;
        failed.errorDetails =
          (result.error?.details as Record<string, unknown> | undefined) ??
          failed.errorDetails;
        failed.retryCount += 1;
      }

      failed.lastAttemptAt = new Date();
      await failed.save();
    }

    return {
      total: failedNotifications.length,
      success: results.filter((item) => item.success).length,
      failed: results.filter((item) => !item.success).length,
      results,
    };
  }

  private async sendPayloadWithRetry(
    payload: NotificationPayload,
    alertSnapshot: Record<string, unknown>,
    persistOnFailure: boolean,
  ): Promise<NotificationResponse> {
    const endpointUrl = `${this.getApiUrl()}/notifications/send`;

    for (let attempt = 1; attempt <= this.maxRetries; attempt += 1) {
      this.logger.log(
        `Notification attempt ${attempt}/${this.maxRetries} to ${endpointUrl}`,
      );

      try {
        const apiKey = this.getApiKey();
        this.logger.debug(`Sending request with API_KEY: ${apiKey ? 'SET' : 'EMPTY'}`);
        
        // Tipamos la respuesta correctamente
        const response: AxiosResponse = await firstValueFrom(
          this.httpService.post(endpointUrl, payload, {
            headers: {
              'x-api-key': apiKey, // ✅ Header corregido
            },
          }),
        );

        this.logger.log(
          `Notification delivered with status ${response.status} on attempt ${attempt}`,
        );

        return {
          success: true,
          message: 'Notification sent successfully',
          attempts: attempt,
          statusCode: response.status,
          data: response.data,
          payload,
        };
      } catch (error) {
        // Tipamos el error como AxiosError para acceder a la respuesta
        const parsedError = this.parseHttpError(error as AxiosError);

        this.logger.error(
          `Notification attempt ${attempt} failed: ${parsedError.message}`,
          JSON.stringify(parsedError.details),
        );

        if (attempt < this.maxRetries) {
          const delay = this.backoffDelaysMs[attempt - 1] ?? 1000;
          this.logger.warn(`Retrying notification in ${delay} ms`);
          await this.sleep(delay);
          continue;
        }

        if (persistOnFailure) {
          await this.persistFailedNotification(
            payload,
            alertSnapshot,
            attempt,
            parsedError,
          );
        }

        return {
          success: false,
          message: 'Notification failed after maximum retries',
          attempts: attempt,
          error: {
            message: parsedError.message,
            details: parsedError.details,
          },
          payload,
        };
      }
    }

    return {
      success: false,
      message: 'Notification failed after maximum retries',
      attempts: this.maxRetries,
      error: {
        message: 'Unexpected notification flow termination',
      },
      payload,
    };
  }

  private buildPayload(alert: any, recipientInfo?: any): NotificationPayload {
    const recipient = this.resolveRecipient(alert, recipientInfo);
    const channel = this.resolveChannel(alert, recipient);

    const payload: NotificationPayload = {
      channel,
      recipient,
      body: {},
    };

    if (channel === 'email') {
      payload.subject =
        alert?.subject ??
        `Alerta ${String(alert?.severity ?? 'warning').toUpperCase()} - ${String(alert?.sensorId ?? 'N/A')}`;
      payload.body.email =
        alert?.body?.email ??
        `<p>${String(alert?.message ?? 'Se detecto una alerta en la plataforma IoT.')}</p>`;

      if (recipient.telefono) {
        payload.body.sms =
          alert?.body?.sms ??
          `ALERTA ${String(alert?.severity ?? 'warning').toUpperCase()} ${String(alert?.sensorId ?? 'N/A')}: ${String(alert?.message ?? 'Revisar activo')}`;
      }
    }

    if (channel === 'sms') {
      payload.body.sms =
        alert?.body?.sms ??
        `ALERTA ${String(alert?.severity ?? 'warning').toUpperCase()} ${String(alert?.sensorId ?? 'N/A')}: ${String(alert?.message ?? 'Revisar activo')}`;
    }

    this.logger.debug(`Notification payload built: ${JSON.stringify(payload)}`);

    return payload;
  }

  private resolveRecipient(alert: any, recipientInfo?: any): NotificationRecipient {
    const email =
      recipientInfo?.email ??
      alert?.recipient?.email ??
      this.configService.get<string>('NOTIFICATIONS_DEFAULT_EMAIL') ??
      undefined;

    const telefono =
      recipientInfo?.telefono ??
      alert?.recipient?.telefono ??
      this.configService.get<string>('NOTIFICATIONS_DEFAULT_PHONE') ??
      undefined;

    if (!email && !telefono) {
      throw new Error(
        'No recipient configured. Provide email or telefono in recipientInfo or alert.recipient.',
      );
    }

    return {
      email,
      telefono,
    };
  }

  private resolveChannel(
    alert: any,
    recipient: NotificationRecipient,
  ): 'email' | 'sms' {
    if (alert?.channel === 'email' || alert?.channel === 'sms') {
      return alert.channel;
    }

    if (recipient.email) {
      return 'email';
    }

    return 'sms';
  }

  private parseHttpError(error: AxiosError): {
    message: string;
    details: Record<string, unknown>;
  } {
    const response = error.response as AxiosResponse | undefined;
    return {
      message: error.message ?? 'Unknown notifications API error',
      details: {
        code: error.code,
        status: response?.status,
        statusText: response?.statusText,
        responseData: response?.data,
      },
    };
  }

  private async persistFailedNotification(
    payload: NotificationPayload,
    alertSnapshot: Record<string, unknown>,
    attempts: number,
    parsedError: {
      message: string;
      details: Record<string, unknown>;
    },
  ): Promise<void> {
    const failed = await this.failedNotificationModel.create({
      payload,
      alertSnapshot,
      errorMessage: parsedError.message,
      errorDetails: parsedError.details,
      attempts,
      status: 'pending',
      lastAttemptAt: new Date(),
      retryCount: 0,
    });

    this.failedInMemory.push({
      id: String(failed._id),
      payload,
      errorMessage: parsedError.message,
      attempts,
      savedAt: new Date().toISOString(),
    });

    this.logger.error(
      `Notification persisted as failed record ${String(failed._id)} after ${attempts} attempts`,
    );
  }

  private getApiUrl(): string {
    return this.configService.get<string>(
      'NOTIFICATIONS_API_URL',
      'https://ucn-agil-notificaciones.up.railway.app',
    );
  }

  private getApiKey(): string {
    // ✅ API Key actualizada (Proyecto 8)
    return this.configService.get<string>(
      'NOTIFICATIONS_API_KEY',
      '5MwKpRnXvB9qYtZ2eHsJdF7gCuA4LiN1', // Nueva clave
    );
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}