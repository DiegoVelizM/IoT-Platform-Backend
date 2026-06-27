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
    summary: 'Verificar estado del backend y conexión a base de datos',
    description:
      'Responde 200 aunque MongoDB esté desconectado; revise el campo `database` en el body. ' +
      'Kafka no se incluye en este health check.',
  })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiReadErrors()
  getHealth() {
    return this.healthService.getHealth();
  }
}