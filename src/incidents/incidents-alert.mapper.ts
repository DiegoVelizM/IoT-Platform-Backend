import { randomUUID } from 'crypto';
import { Alert } from '../alerts/schemas/alert.schema';
import { AnalyticsAlertContext } from '../analytics/interfaces/analytics-alert-context.interface';
import { EventType } from '../common/events/event-types';
import { IncidentsAlertEnvelope } from './interfaces/incidents-alert-payload.interface';

const DEFAULT_SYSTEM_ID = 'P08';
const DEFAULT_SOURCE = 'iot-platform';

export function mapAlertToIncidentsEnvelope(
  alert: Alert,
  systemId: string = DEFAULT_SYSTEM_ID,
  context?: AnalyticsAlertContext,
): IncidentsAlertEnvelope {
  const payload: IncidentsAlertEnvelope['payload'] = {
    eventId: randomUUID(),
    eventType: EventType.ALERT_GENERATED,
    occurredAt: (alert.occurredAt ?? new Date()).toISOString(),
    source: DEFAULT_SOURCE,
    sensorId: alert.sensorId,
    alertType: alert.type,
    severity: alert.severity,
    message: alert.message,
  };

  if (context?.assetId) {
    payload.assetId = context.assetId;
  }

  return {
    sistema_id: systemId,
    payload,
  };
}
