import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Alert } from '../alerts/schemas/alert.schema';
import { AnalyticsAlertContext } from '../analytics/interfaces/analytics-alert-context.interface';
import { ErrorCode } from '../common/errors/error-codes';
import { mapAlertToIncidentsEnvelope } from './incidents-alert.mapper';
import { IncidentsPublishResult } from './interfaces/incidents-publish-result.interface';

const DEFAULT_SYSTEM_ID = 'P08';
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

    this.logger.log(`Incidents integration enabled → ${this.alertsUrl}`);
  }

  publishAlert(
    alert: Alert,
    context?: AnalyticsAlertContext,
  ): void {
    if (!this.enabled) {
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
        const isRetryable = RETRYABLE_STATUS_CODES.has(response.status);

        if (isRetryable && attempt < MAX_RETRIES) {
          const delayMs = BASE_DELAY_MS * 2 ** attempt;

          this.logger.warn(
            `Incidents API returned HTTP ${response.status}, retrying in ${delayMs}ms`,
          );

          await this.sleep(delayMs);
          continue;
        }

        throw new Error(
          `HTTP ${response.status}: ${errorBody || response.statusText}`,
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const isLastAttempt = attempt === MAX_RETRIES;

        if (!isLastAttempt) {
          const delayMs = BASE_DELAY_MS * 2 ** attempt;

          this.logger.warn(
            `Failed to send incidents alert, retrying in ${delayMs}ms: ${errorMessage}`,
          );

          await this.sleep(delayMs);
          continue;
        }

        this.logger.warn(
          `Failed to send incidents alert for sensor ${envelope.payload.sensorId}: ${errorMessage}`,
        );

        return {
          success: false,
          errorCode: ErrorCode.INCIDENTS_PUBLISH_FAILED,
          errorMessage,
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
