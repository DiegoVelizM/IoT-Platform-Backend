import { EventType } from '../common/events/event-types';
import {
  mapAlertResolvedToIncidentsEnvelope,
  mapAlertToIncidentsEnvelope,
} from './incidents-alert.mapper';

describe('IncidentsAlertMapper', () => {
  it('maps open alert with alert_generated event type', () => {
    const envelope = mapAlertToIncidentsEnvelope(
      {
        sensorId: 'OXI-001',
        type: 'sensor_offline',
        severity: 'critical',
        message: 'Sensor is offline',
        resolved: false,
        occurredAt: new Date('2026-07-04T12:00:00.000Z'),
      } as never,
      'P08',
    );

    expect(envelope.sistema_id).toBe('P08');
    expect(envelope.payload.eventType).toBe(EventType.ALERT_GENERATED);
    expect(envelope.payload.sensorId).toBe('OXI-001');
    expect(envelope.payload.alertType).toBe('sensor_offline');
    expect(envelope.payload.severity).toBe('critical');
  });

  it('maps resolved alert with minimal payload for P11', () => {
    const envelope = mapAlertResolvedToIncidentsEnvelope(
      'OXI-001',
      'sensor_offline',
      'P08',
    );

    expect(envelope.sistema_id).toBe('P08');
    expect(envelope.payload.eventType).toBe(EventType.ALERT_RESOLVED);
    expect(envelope.payload.sensorId).toBe('OXI-001');
    expect(envelope.payload.alertType).toBe('sensor_offline');
    expect(envelope.payload.severity).toBeUndefined();
    expect(envelope.payload.message).toBeUndefined();
  });
});
