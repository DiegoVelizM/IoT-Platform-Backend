import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Alert } from '../alerts/schemas/alert.schema';
import { SensorReading } from '../sensors/schemas/sensor-reading.schema';
import { ErrorCode } from '../common/errors/error-codes';
import {
  formatHttpFetchErrorLog,
  parseHttpFetchError,
  parseHttpStatusError,
} from '../common/utils/http-fetch-error.util';
import {
  mapAlertToAnalyticsEvent,
  mapTelemetryReceivedEvent,
} from './analytics-event.mapper';
import { AnalyticsAlertContext } from './interfaces/analytics-alert-context.interface';
import { AnalyticsPublishResult } from './interfaces/analytics-publish-result.interface';

const DEFAULT_SOURCE = 'iot_devices';

@Injectable()
export class AnalyticsEventsService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsEventsService.name);
  private readonly explicitlyDisabled =
    process.env.ANALYTICS_EVENTS_ENABLED === 'false';
  private readonly eventsUrl = process.env.ANALYTICS_EVENTS_URL?.trim();
  private readonly source =
    process.env.ANALYTICS_EVENTS_SOURCE?.trim() || DEFAULT_SOURCE;

  private get enabled(): boolean {
    return !this.explicitlyDisabled && Boolean(this.eventsUrl);
  }

  onModuleInit(): void {
    if (this.explicitlyDisabled) {
      this.logger.log(
        'Analytics integration disabled via ANALYTICS_EVENTS_ENABLED=false',
      );
      return;
    }

    if (!this.eventsUrl) {
      this.logger.warn(
        'Analytics integration disabled: ANALYTICS_EVENTS_URL is not configured',
      );
      return;
    }

    this.logger.log(`Analytics integration enabled → ${this.eventsUrl}`);
  }

  publishTelemetry(
    reading: SensorReading & { createdAt?: Date },
  ): void {
    if (!this.enabled) {
      return;
    }

    const envelope = mapTelemetryReceivedEvent(reading, this.source);

    void this.sendEnvelope(envelope);
  }

  publishAlert(alert: Alert, context: AnalyticsAlertContext): void {
    if (!this.enabled) {
      return;
    }

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
    if (!this.enabled || !this.eventsUrl) {
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
        const parsed = parseHttpStatusError(response.status, errorBody);

        this.logger.warn(
          formatHttpFetchErrorLog(
            'P09',
            this.eventsUrl,
            parsed,
            envelope.event_type,
          ),
        );

        return {
          success: false,
          eventType: envelope.event_type,
          errorCode: ErrorCode.ANALYTICS_PUBLISH_FAILED,
          errorMessage: `${parsed.message}${parsed.detail ? `: ${parsed.detail}` : ''}`,
        };
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
      const parsed = parseHttpFetchError(err);

      this.logger.warn(
        formatHttpFetchErrorLog(
          'P09',
          this.eventsUrl!,
          parsed,
          envelope.event_type,
        ),
      );

      return {
        success: false,
        eventType: envelope.event_type,
        errorCode: ErrorCode.ANALYTICS_PUBLISH_FAILED,
        errorMessage: parsed.detail ?? parsed.message,
      };
    }
  }
}
