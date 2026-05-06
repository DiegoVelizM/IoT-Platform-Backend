import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateSensorReadingDto } from '../sensors/dto/create-sensor-reading.dto';
import { SensorsService } from '../sensors/sensors.service';

@ApiTags('Telemetry')
@Controller('telemetry')
export class TelemetryController {
    constructor(private readonly sensorsService: SensorsService) {}

    @Post()
    @ApiOperation({ summary: 'Recibir telemetría de sensores simulados' })
    create(@Body() createSensorReadingDto: CreateSensorReadingDto) {
        return this.sensorsService.create(createSensorReadingDto);
    }
}