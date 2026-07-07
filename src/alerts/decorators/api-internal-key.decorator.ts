import { applyDecorators } from '@nestjs/common';
import { ApiHeader, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { StandardErrorResponseDto } from '../../common/dto/error-response.dto';

export function ApiInternalKeyRequired() {
  return applyDecorators(
    ApiHeader({
      name: 'X-Internal-Api-Key',
      description:
        'Clave interna del equipo P08 para crear alertas manualmente vía POST /alerts',
      required: true,
    }),
    ApiUnauthorizedResponse({
      description:
        'Falta o es inválida la clave interna (header X-Internal-Api-Key)',
      type: StandardErrorResponseDto,
    }),
  );
}
