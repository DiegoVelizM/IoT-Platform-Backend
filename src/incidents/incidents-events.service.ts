import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Alert } from '../alerts/schemas/alert.schema';
import { AnalyticsAlertContext } from '../analytics/interfaces/analytics-alert-context.interface';
import { ErrorCode } from '../common/errors/error-codes';
import {
  formatHttpFetchErrorLog,
  parseHttpFetchError,
  parseHttpStatusError,
} from '../common/utils/http-fetch-error.util';
import { mapAlertToIncidentsEnvelope } from './incidents-alert.mapper';
import { IncidentsPublishResult } from './interfaces/incidents-publish-result.interface';

const DEFAULT_SYSTEM_ID = 'P08';
const DEFAULT_MIN_SEVERITY = 'warning';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;
const RETRYABLE_STATUS_CODES = new Set([429, 502, 503]);

@Injectable()
export class IncidentsEventsService implements OnModuleInit {
  private readonly logger = new Logger(IncidentsEventsService.name);
  private readonly explicitlyDisabled =
    process.env.INCIDENTS_ALERTS_ENABLED === 'false';
  private readonly alertsUrl = process.env.INCIDENTS_ALERTS_URL?.trim();
  private readonly systemId =
    process.env.INCIDENTS_SYSTEM_ID?.trim() || DEFAULT_SYSTEM_ID;
  private readonly apiKey = process.env.INCIDENTS_API_KEY?.trim();
  private readonly jwtToken = process.env.INCIDENTS_JWT_TOKEN?.trim();
  private readonly minSeverity =
    process.env.INCIDENTS_MIN_SEVERITY?.trim().toLowerCase() === 'critical'
      ? 'critical'
      : DEFAULT_MIN_SEVERITY;

  private get enabled(): boolean {
    return !this.explicitlyDisabled && Boolean(this.alertsUrl);
  }

  onModuleInit(): void {
    if (this.explicitlyDisabled) {
      this.logger.log(
        'Incidents integration disabled via INCIDENTS_ALERTS_ENABLED=false',
      );
      return;
    }

    if (!this.alertsUrl) {
      this.logger.warn(
        'Incidents integration disabled: INCIDENTS_ALERTS_URL is not configured',
      );
      return;
    }

    if (!this.apiKey) {
      this.logger.warn(
        'Incidents integration enabled without INCIDENTS_API_KEY; P11 may reject requests with 401',
      );
    }

    this.logger.log(
      `Incidents integration enabled → ${this.alertsUrl} (min severity: ${this.minSeverity})`,
    );
  }

  publishAlert(
    alert: Alert,
    context?: AnalyticsAlertContext,
  ): void {
    if (!this.enabled) {
      return;
    }

    if (this.minSeverity === 'critical' && alert.severity !== 'critical') {
      this.logger.debug(
        `Skipping incidents alert for sensor ${alert.sensorId}: severity ${alert.severity} below threshold`,
      );
      return;
    }

    const envelope = mapAlertToIncidentsEnvelope(
      alert,
      this.systemId,
      context,
    );

    void this.sendEnvelope(envelope);
  }

  private async sendEnvelope(
    envelope: ReturnType<typeof mapAlertToIncidentsEnvelope>,
  ): Promise<IncidentsPublishResult> {
    if (!this.enabled || !this.alertsUrl) {
      return { success: true, skipped: true };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    if (this.jwtToken) {
      headers.Authorization = `Bearer ${this.jwtToken}`;
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        this.logger.log(
          `Sending alert to incidents API (attempt ${attempt + 1}/${MAX_RETRIES + 1}) sensor=${envelope.payload.sensorId}`,
        );

        const response = await fetch(this.alertsUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(envelope),
        });

        if (response.ok) {
          this.logger.log(
            `Incidents alert acknowledged for sensor ${envelope.payload.sensorId}`,
          );

          return { success: true };
        }

        const errorBody = await response.text();
        const parsed = parseHttpStatusError(response.status, errorBody);
        const isRetryable = RETRYABLE_STATUS_CODES.has(response.status);

        if (isRetryable && attempt < MAX_RETRIES) {
          const delayMs = BASE_DELAY_MS * 2 ** attempt;

          this.logger.warn(
            formatHttpFetchErrorLog(
              'P11',
              this.alertsUrl,
              parsed,
              `sensor=${envelope.payload.sensorId}, retry in ${delayMs}ms`,
            ),
          );

          await this.sleep(delayMs);
          continue;
        }

        this.logger.warn(
          formatHttpFetchErrorLog(
            'P11',
            this.alertsUrl,
            parsed,
            `sensor=${envelope.payload.sensorId}`,
          ),
        );

        return {
          success: false,
          errorCode: ErrorCode.INCIDENTS_PUBLISH_FAILED,
          errorMessage: `${parsed.message}${parsed.detail ? `: ${parsed.detail}` : ''}`,
        };
      } catch (err) {
        const parsed = parseHttpFetchError(err);
        const isLastAttempt = attempt === MAX_RETRIES;

        if (!isLastAttempt) {
          const delayMs = BASE_DELAY_MS * 2 ** attempt;

          this.logger.warn(
            formatHttpFetchErrorLog(
              'P11',
              this.alertsUrl!,
              parsed,
              `sensor=${envelope.payload.sensorId}, retry in ${delayMs}ms`,
            ),
          );

          await this.sleep(delayMs);
          continue;
        }

        this.logger.warn(
          formatHttpFetchErrorLog(
            'P11',
            this.alertsUrl!,
            parsed,
            `sensor=${envelope.payload.sensorId}`,
          ),
        );

        return {
          success: false,
          errorCode: ErrorCode.INCIDENTS_PUBLISH_FAILED,
          errorMessage: parsed.detail ?? parsed.message,
        };
      }
    }

    return {
      success: false,
      errorCode: ErrorCode.INCIDENTS_PUBLISH_FAILED,
      errorMessage: 'Unexpected retry loop exit',
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
