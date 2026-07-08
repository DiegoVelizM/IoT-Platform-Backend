import { applyDecorators } from '@nestjs/common';
import { ApiHeader, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { StandardErrorResponseDto } from '../../common/dto/error-response.dto';

export function ApiTelemetryKeyRequired() {
  return applyDecorators(
    ApiHeader({
      name: 'X-Telemetry-Key',
      description:
        'Clave para ingesta de telemetría (TELEMETRY_API_KEY). También acepta X-Internal-Api-Key si el cliente ya dispone de clave interna.',
      required: true,
    }),
    ApiUnauthorizedResponse({
      description:
        'Falta o es inválida la clave de telemetría (header X-Telemetry-Key o X-Internal-Api-Key)',
      type: StandardErrorResponseDto,
    }),
  );
}
