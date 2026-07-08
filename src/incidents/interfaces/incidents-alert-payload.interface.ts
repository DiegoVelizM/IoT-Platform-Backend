export interface IncidentsAlertPayload {
  eventId: string;
  eventType: string;
  occurredAt: string;
  source: string;
  sensorId: string;
  alertType: string;
  severity?: string;
  message?: string;
  assetId?: string;
}

export interface IncidentsAlertEnvelope {
  sistema_id: string;
  creado_en: string;
  payload: IncidentsAlertPayload;
}
