import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateSensorReadingDto } from '../sensors/dto/create-sensor-reading.dto';
import { SensorsService } from '../sensors/sensors.service';

@ApiTags('Telemetry')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Post()
  @ApiOperation({ summary: 'Recibir telemetría de sensores simulados' })
  create(@Body() createSensorReadingDto: CreateSensorReadingDto) {
    return this.sensorsService.create(createSensorReadingDto);
  }
}
