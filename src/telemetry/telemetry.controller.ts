import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiWriteErrors } from '../common/decorators/api-standard-errors.decorator';
import { CreateSensorReadingDto } from '../sensors/dto/create-sensor-reading.dto';
import { SensorsService } from '../sensors/sensors.service';
import { TelemetryApiKeyGuard } from './guards/telemetry-api-key.guard';
import { ApiTelemetryKeyRequired } from './decorators/api-telemetry-key.decorator';

@ApiTags('Telemetry')
@Controller('telemetry')
export class TelemetryController {
  private readonly logger = new Logger(TelemetryController.name);

  constructor(private readonly sensorsService: SensorsService) {}

  @Post()
  @UseGuards(TelemetryApiKeyGuard)
  @ApiTelemetryKeyRequired()
  @ApiBody({
    type: CreateSensorReadingDto,
    examples: {
      thermometer: {
        summary: 'Termómetro de insumos',
        value: {
          sensorId: 'THERMO-001',
          assetId: 'MEDKIT-001',
          sensorType: 'thermometer',
          batteryLevel: 90,
          connectionStatus: 'connected',
          temperature: 5.4,
        },
      },
      glucometer: {
        summary: 'Glucómetro portátil',
        value: {
          sensorId: 'GLUCO-001',
          assetId: 'PATIENT-001',
          sensorType: 'glucometer',
          batteryLevel: 82,
          connectionStatus: 'connected',
          glucoseLevel: 145,
        },
      },
      pulseOximeter: {
        summary: 'Pulsioxímetro',
        value: {
          sensorId: 'OXI-001',
          assetId: 'PATIENT-001',
          sensorType: 'pulse_oximeter',
          batteryLevel: 85,
          connectionStatus: 'connected',
          oxygenSaturation: 96,
          heartRate: 82,
        },
      },
      sphygmomanometer: {
        summary: 'Esfigmomanómetro',
        value: {
          sensorId: 'BP-001',
          assetId: 'PATIENT-001',
          sensorType: 'sphygmomanometer',
          batteryLevel: 70,
          connectionStatus: 'connected',
          systolicPressure: 120,
          diastolicPressure: 80,
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Recibir telemetría de sensores simulados',
    description:
      'Persiste la lectura en MongoDB, evalúa umbrales para alertas y publica el evento `telemetry_received` en Kafka. ' +
      'Si Kafka falla, la telemetría se guarda y la respuesta puede incluir `warnings` con códigos KAFKA_PUBLISH_FAILED o KAFKA_CONNECTION_FAILED.',
  })
  @ApiCreatedResponse({
    description:
      'Lectura procesada y almacenada. Puede incluir warnings si falló la publicación en Kafka',
    type: CreateSensorReadingDto,
  })
  @ApiWriteErrors()
  async create(@Body() createSensorReadingDto: CreateSensorReadingDto) {
    try {
      this.logger.log(
        `Telemetry received from sensor ${createSensorReadingDto.sensorId}`,
      );

      return await this.sensorsService.create(createSensorReadingDto);
    } catch (error) {
      this.logger.error(
        `Failed to process telemetry from sensor ${createSensorReadingDto.sensorId}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }
}