import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AlertDocument = HydratedDocument<Alert>;

@Schema({ timestamps: true })
export class Alert {
  @Prop({ required: true, unique: true })
  alertId: string;

  @Prop({ required: true })
  sensorId: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true, enum: ['low', 'medium', 'high', 'critical'] })
  severity: string;

  @Prop({ default: false })
  acknowledged: boolean;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);