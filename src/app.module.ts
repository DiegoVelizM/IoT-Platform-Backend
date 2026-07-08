import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SensorsModule } from './sensors/sensors.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { HealthModule } from './health/health.module';
import { EventsModule } from './events/events.module';
import { AlertsModule } from './alerts/alerts.module';
import { SimulationModule } from './simulation/simulation.module';
import { KafkaModule } from './kafka/kafka.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { IncidentsModule } from './incidents/incidents.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/sensores_db', {
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS: 10_000,
    }),
    SensorsModule,
    TelemetryModule,
    HealthModule,
    EventsModule,
    AlertsModule,
    KafkaModule,
    AnalyticsModule,
    IncidentsModule,
    NotificationsModule,
    SimulationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

