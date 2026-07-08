export type NotificationChannel = 'email' | 'sms';

export interface NotificationRecipient {
  email?: string;
  telefono?: string;
}

export interface NotificationBody {
  email?: string;
  sms?: string;
}

export interface NotificationPayload {
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  subject?: string;
  body: NotificationBody;
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  attempts: number;
  statusCode?: number;
  data?: unknown;
  payload?: NotificationPayload;
  error?: {
    message: string;
    details?: unknown;
  };
}
