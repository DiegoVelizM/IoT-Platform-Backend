import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AlertDocument = HydratedDocument<Alert>;

@Schema({ timestamps: true })
export class Alert {
  @Prop({ required: true })
  sensorId!: string;

  @Prop({ required: true })
  type!: string;

  @Prop({ required: true, enum: ['warning', 'critical'] })
  severity!: 'warning' | 'critical';

  @Prop({ required: true })
  message!: string;

  @Prop({ default: false })
  resolved!: boolean;

  @Prop({ required: true, default: Date.now })
  occurredAt!: Date;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);

AlertSchema.index({ sensorId: 1, createdAt: -1 });
AlertSchema.index({ createdAt: -1 });
AlertSchema.index({ resolved: 1, createdAt: -1 });
