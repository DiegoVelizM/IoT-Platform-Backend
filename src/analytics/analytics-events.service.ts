import { Injectable, Logger } from '@nestjs/common';
import { Alert } from '../alerts/schemas/alert.schema';
import { SensorReading } from '../sensors/schemas/sensor-reading.schema';
import { ErrorCode } from '../common/errors/error-codes';
import {
  mapAlertToAnalyticsEvent,
  mapTelemetryReceivedEvent,
} from './analytics-event.mapper';
import { AnalyticsAlertContext } from './interfaces/analytics-alert-context.interface';
import { AnalyticsPublishResult } from './interfaces/analytics-publish-result.interface';

const DEFAULT_EVENTS_URL =
  'https://analisis-proyecto-ti.onrender.com/v1/events';

@Injectable()
export class AnalyticsEventsService {
  private readonly logger = new Logger(AnalyticsEventsService.name);
  private readonly enabled =
    process.env.ANALYTICS_EVENTS_ENABLED !== 'false';
  private readonly eventsUrl =
    process.env.ANALYTICS_EVENTS_URL ?? DEFAULT_EVENTS_URL;
  private readonly source =
    process.env.ANALYTICS_EVENTS_SOURCE ?? 'iot_devices';

  publishTelemetry(
    reading: SensorReading & { createdAt?: Date },
  ): void {
    const envelope = mapTelemetryReceivedEvent(reading, this.source);

    void this.sendEnvelope(envelope);
  }

  publishAlert(alert: Alert, context: AnalyticsAlertContext): void {
    const envelope = mapAlertToAnalyticsEvent(alert, context, this.source);

    if (!envelope) {
      this.logger.debug(
        `Skipping analytics event for unsupported alert type ${alert.type}`,
      );
      return;
    }

    void this.sendEnvelope(envelope);
  }

  private async sendEnvelope(envelope: {
    source: string;
    event_type: string;
    payload: Record<string, unknown>;
  }): Promise<AnalyticsPublishResult> {
    if (!this.enabled) {
      return { success: true, skipped: true, eventType: envelope.event_type };
    }

    try {
      this.logger.log(
        `Sending analytics event ${envelope.event_type} to ${this.eventsUrl}`,
      );

      const response = await fetch(this.eventsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(envelope),
      });

      if (!response.ok) {
        const errorBody = await response.text();

        throw new Error(
          `HTTP ${response.status}: ${errorBody || response.statusText}`,
        );
      }

      const body = (await response.json()) as {
        status?: string;
        event_id?: string;
      };

      this.logger.log(
        `Analytics event ${envelope.event_type} acknowledged (${body.event_id ?? 'no event_id'})`,
      );

      return {
        success: true,
        eventType: envelope.event_type,
        eventId: body.event_id,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      this.logger.warn(
        `Failed to send analytics event ${envelope.event_type}: ${errorMessage}`,
      );

      return {
        success: false,
        eventType: envelope.event_type,
        errorCode: ErrorCode.ANALYTICS_PUBLISH_FAILED,
        errorMessage,
      };
    }
  }
}
