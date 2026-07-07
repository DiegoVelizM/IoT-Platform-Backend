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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config: Record<string, string | undefined>) => {
        const apiKey = config.API_KEY;

        if (!apiKey) {
          throw new Error('API_KEY environment variable is required');
        }

        return {
          API_KEY: apiKey,
          PORT: config.PORT ?? '3000',
          MONGODB_URI:
            config.MONGODB_URI ?? 'mongodb://localhost:27017/sensores_db',
          CORS_ORIGIN: config.CORS_ORIGIN,
          SWAGGER_ENABLED: config.SWAGGER_ENABLED,
        };
      },
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? 'mongodb://localhost:27017/sensores_db',
    ),
    SensorsModule,
    TelemetryModule,
    HealthModule,
    EventsModule,
    AlertsModule,
    SimulationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
