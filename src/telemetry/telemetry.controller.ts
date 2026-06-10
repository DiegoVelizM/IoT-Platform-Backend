import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateSensorReadingDto } from '../sensors/dto/create-sensor-reading.dto';
import { SensorsService } from '../sensors/sensors.service';

@ApiTags('Telemetry')
@Controller('telemetry')
export class TelemetryController {
    constructor(private readonly sensorsService: SensorsService) {}
    
    @Post()
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

    @ApiOperation({ summary: 'Recibir telemetría de sensores simulados' })
    create(@Body() createSensorReadingDto: CreateSensorReadingDto) {
        return this.sensorsService.create(createSensorReadingDto);
    }
}