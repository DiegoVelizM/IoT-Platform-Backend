import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiReadErrors } from '../common/decorators/api-standard-errors.decorator';
import { HealthResponseDto } from './dto/health-response.dto';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Verificar estado del backend, MongoDB y Kafka',
    description:
      'Responde 200 con status `ok` o `degraded`. Revise los campos `database` y `kafka` para detectar dependencias caídas.',
  })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiReadErrors()
  getHealth() {
    return this.healthService.getHealth();
  }
}