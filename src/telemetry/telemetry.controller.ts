import { Body, Controller, Post, UseGuards, UsePipes } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SensorReadingValidationPipe } from '../common/pipes/sensor-reading-validation.pipe';
import { SensorsService } from '../sensors/sensors.service';

@ApiTags('Telemetry')
@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Post()
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Recibir telemetría de sensores simulados' })
  @UsePipes(new SensorReadingValidationPipe())
  create(@Body() createSensorReadingDto: any) {
    return this.sensorsService.create(createSensorReadingDto);
  }
}
