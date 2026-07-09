import { applyDecorators } from '@nestjs/common';
import { ApiHeader, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { StandardErrorResponseDto } from '../../common/dto/error-response.dto';

export function ApiSimulationKeyRequired() {
  return applyDecorators(
    ApiHeader({
      name: 'X-Simulation-Key',
      description:
        'Clave compartida solo con el equipo P08 (o terceros autorizados) para simulación automática y escenarios de demostración',
      required: true,
    }),
    ApiUnauthorizedResponse({
      description:
        'Falta o es inválida la clave de simulación (header X-Simulation-Key)',
      type: StandardErrorResponseDto,
    }),
  );
}
