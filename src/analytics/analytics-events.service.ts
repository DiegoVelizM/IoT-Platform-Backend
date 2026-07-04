import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Alert } from '../alerts/schemas/alert.schema';
import { SensorReading } from '../sensors/schemas/sensor-reading.schema';
import { ErrorCode } from '../common/errors/error-codes';
import {
  MinuteRateLimiter,
  resolvePositiveIntEnv,
} from '../common/utils/minute-rate-limiter.util';
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
const DEFAULT_MAX_REQUESTS_PER_MINUTE = 90;
const THROTTLE_LOG_INTERVAL_MS = 60_000;

@Injectable()
export class AnalyticsEventsService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsEventsService.name);
  private readonly explicitlyDisabled =
    process.env.ANALYTICS_EVENTS_ENABLED === 'false';
  private readonly eventsUrl = process.env.ANALYTICS_EVENTS_URL?.trim();
  private readonly source =
    process.env.ANALYTICS_EVENTS_SOURCE?.trim() || DEFAULT_SOURCE;
  private readonly maxRequestsPerMinute = resolvePositiveIntEnv(
    process.env.ANALYTICS_MAX_REQUESTS_PER_MINUTE,
    DEFAULT_MAX_REQUESTS_PER_MINUTE,
  );
  private readonly outboundLimiter = new MinuteRateLimiter(
    this.maxRequestsPerMinute,
  );

  private throttledSinceLastLog = 0;
  private lastThrottleLogAt = 0;

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

    const throttleMessage =
      this.maxRequestsPerMinute > 0
        ? `local throttle ${this.maxRequestsPerMinute} req/min`
        : 'local throttle disabled';

    this.logger.log(
      `Analytics integration enabled → ${this.eventsUrl} (${throttleMessage})`,
    );
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

    if (!this.outboundLimiter.tryAcquire()) {
      this.recordLocalThrottle(envelope.event_type);

      return {
        success: true,
        skipped: true,
        eventType: envelope.event_type,
        errorCode: ErrorCode.ANALYTICS_THROTTLED,
        errorMessage: `Local throttle limit reached (${this.maxRequestsPerMinute}/min)`,
      };
    }

    try {
      this.logger.debug(
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

      this.logger.debug(
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

  private recordLocalThrottle(eventType: string): void {
    this.throttledSinceLastLog++;
    const now = Date.now();

    if (now - this.lastThrottleLogAt < THROTTLE_LOG_INTERVAL_MS) {
      return;
    }

    this.logger.warn(
      `P09 local throttle: dropped ${this.throttledSinceLastLog} event(s) in the last ${THROTTLE_LOG_INTERVAL_MS / 1000}s (limit ${this.maxRequestsPerMinute}/min, last type ${eventType})`,
    );

    this.throttledSinceLastLog = 0;
    this.lastThrottleLogAt = now;
  }
}
