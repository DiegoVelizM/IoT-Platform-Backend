import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { SensorsService } from './sensors.service';

@ApiTags('Sensors')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('sensors')
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las lecturas' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.sensorsService.findAll(query);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Obtener última lectura registrada' })
  findLatest() {
    return this.sensorsService.findLatest();
  }

  @Get('sensor/:sensorId')
  @ApiOperation({ summary: 'Obtener lecturas por sensor' })
  findBySensor(
    @Param('sensorId') sensorId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.sensorsService.findBySensor(sensorId, query);
  }
}
