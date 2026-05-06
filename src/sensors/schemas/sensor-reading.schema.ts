import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SensorReadingDocument = HydratedDocument<SensorReading>;

@Schema({ timestamps: true })
export class SensorReading {
    @Prop({ required: true })
    sensorId!: string;

    @Prop({ required: true })
    location!: string;

    @Prop({ required: true })
    temperature!: number;

    @Prop({ required: true })
    humidity!: number;

    @Prop({ required: true })
    gasLevel!: number;

    @Prop({ required: true })
    batteryLevel!: number;

    @Prop({ default: false })
    alert!: boolean;

    @Prop({ required: true })
    latitude!: number;

    @Prop({ required: true })
    longitude!: number;

    @Prop({ required: true })
    timestamp!: string;
}

export const SensorReadingSchema = SchemaFactory.createForClass(SensorReading);