import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SensorsService } from '../sensors/sensors.service';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Get(':id/status')
  @ApiOperation({
    summary: 'Devuelve la última lectura de cada tipo de sensor para un asset',
  })
  async status(@Param('id') id: string) {
    const types = ['temperature', 'heart_rate', 'glucose', 'blood_pressure'];
    const result: any = {};

    for (const type of types) {
      const reading = await this.sensorsService.findLatestByTypeForAsset(
        id,
        type,
      );
      if (!reading) continue;

      switch (type) {
        case 'temperature':
          result.temperature = reading.temperature;
          break;
        case 'heart_rate':
          result.heart_rate = reading.heart_rate;
          break;
        case 'glucose':
          result.glucose = reading.glucose;
          break;
        case 'blood_pressure':
          result.systolic = reading.systolic;
          result.diastolic = reading.diastolic;
          break;
      }
    }

    return result;
  }

  @Get(':id/telemetry/latest')
  @ApiOperation({ summary: 'Última lectura general del asset' })
  latest(@Param('id') id: string) {
    return this.sensorsService.findLatestForAsset(id);
  }

  @Get(':id/telemetry/history')
  @ApiOperation({ summary: 'Historial paginado de telemetría para un asset' })
  history(@Param('id') id: string, @Query() query: any) {
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 20);
    return this.sensorsService.findHistory(id, query, page, pageSize);
  }
}
