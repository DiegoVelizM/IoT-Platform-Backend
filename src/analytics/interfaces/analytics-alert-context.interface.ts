export interface AnalyticsAlertContext {
  assetId: string;
  sensorType: string;
  batteryLevel?: number;
  connectionStatus?: string;
  currentValue?: number;
}
