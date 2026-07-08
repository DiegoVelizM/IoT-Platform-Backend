import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { NotificationPayload } from '../interfaces/notification.interface';

export type FailedNotificationDocument = HydratedDocument<FailedNotification>;

@Schema({ timestamps: true })
export class FailedNotification {
  @Prop({ type: Object, required: true })
  payload!: NotificationPayload;

  @Prop({ type: Object })
  alertSnapshot?: Record<string, unknown>;

  @Prop({ required: true })
  errorMessage!: string;

  @Prop({ type: Object })
  errorDetails?: Record<string, unknown>;

  @Prop({ required: true })
  attempts!: number;

  @Prop({ default: 'pending', enum: ['pending', 'retried', 'resolved'] })
  status!: 'pending' | 'retried' | 'resolved';

  @Prop({ default: Date.now })
  lastAttemptAt!: Date;

  @Prop({ default: 0 })
  retryCount!: number;
}

export const FailedNotificationSchema = SchemaFactory.createForClass(FailedNotification);
