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
const DEFAULT_QUEUE_MAX_SIZE = 200;
const RATE_LIMIT_POLL_MS = 200;
const QUEUE_DROP_LOG_INTERVAL_MS = 60_000;

interface AnalyticsEnvelope {
  source: string;
  event_type: string;
  payload: Record<string, unknown>;
}

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
  private readonly maxQueueSize = resolvePositiveIntEnv(
    process.env.ANALYTICS_QUEUE_MAX_SIZE,
    DEFAULT_QUEUE_MAX_SIZE,
  );
  private readonly outboundLimiter = new MinuteRateLimiter(
    this.maxRequestsPerMinute,
  );

  private readonly queue: AnalyticsEnvelope[] = [];
  private isProcessingQueue = false;
  private droppedSinceLastLog = 0;
  private lastDropLogAt = 0;

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

    const rateMessage =
      this.maxRequestsPerMinute > 0
        ? `${this.maxRequestsPerMinute} req/min`
        : 'sin límite de tasa';

    this.logger.log(
      `Analytics integration enabled → ${this.eventsUrl} (cola máx ${this.maxQueueSize}, envío ${rateMessage})`,
    );
  }

  publishTelemetry(
    reading: SensorReading & { createdAt?: Date },
  ): void {
    if (!this.enabled) {
      return;
    }

    const envelope = mapTelemetryReceivedEvent(reading, this.source);

    this.enqueue(envelope);
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

    this.enqueue(envelope);
  }

  private enqueue(envelope: AnalyticsEnvelope): AnalyticsPublishResult {
    if (!this.enabled || !this.eventsUrl) {
      return { success: true, skipped: true, eventType: envelope.event_type };
    }

    if (this.maxQueueSize > 0 && this.queue.length >= this.maxQueueSize) {
      this.recordQueueDrop(envelope.event_type);

      return {
        success: true,
        skipped: true,
        eventType: envelope.event_type,
        errorCode: ErrorCode.ANALYTICS_THROTTLED,
        errorMessage: `Analytics queue full (max ${this.maxQueueSize})`,
      };
    }

    this.queue.push(envelope);
    void this.processQueue();

    return {
      success: true,
      eventType: envelope.event_type,
    };
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.queue.length > 0) {
        if (this.maxRequestsPerMinute > 0) {
          while (!this.outboundLimiter.tryAcquire()) {
            await this.sleep(RATE_LIMIT_POLL_MS);
          }
        }

        const envelope = this.queue.shift();

        if (!envelope) {
          break;
        }

        await this.deliverEnvelope(envelope);
      }
    } finally {
      this.isProcessingQueue = false;

      if (this.queue.length > 0) {
        void this.processQueue();
      }
    }
  }

  private async deliverEnvelope(
    envelope: AnalyticsEnvelope,
  ): Promise<AnalyticsPublishResult> {
    if (!this.eventsUrl) {
      return { success: true, skipped: true, eventType: envelope.event_type };
    }

    try {
      this.logger.debug(
        `Sending analytics event ${envelope.event_type} to ${this.eventsUrl} (queued=${this.queue.length})`,
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
          this.eventsUrl,
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

  private recordQueueDrop(eventType: string): void {
    this.droppedSinceLastLog++;
    const now = Date.now();

    if (now - this.lastDropLogAt < QUEUE_DROP_LOG_INTERVAL_MS) {
      return;
    }

    this.logger.warn(
      `P09 analytics queue full: dropped ${this.droppedSinceLastLog} event(s) in the last ${QUEUE_DROP_LOG_INTERVAL_MS / 1000}s (max ${this.maxQueueSize}, last type ${eventType})`,
    );

    this.droppedSinceLastLog = 0;
    this.lastDropLogAt = now;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
