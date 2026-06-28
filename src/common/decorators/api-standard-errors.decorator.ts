import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import {
  NotFoundErrorResponseDto,
  StandardErrorResponseDto,
  ValidationErrorResponseDto,
} from '../dto/error-response.dto';

export function ApiWriteErrors() {
  return applyDecorators(
    ApiBadRequestResponse({
      description:
        'Body inválido: campos requeridos ausentes, tipos incorrectos, valores fuera de rango o propiedades no permitidas',
      type: ValidationErrorResponseDto,
    }),
    ApiInternalServerErrorResponse({
      description:
        'Error interno del servidor (por ejemplo, MongoDB no disponible o fallo al persistir datos)',
      type: StandardErrorResponseDto,
    }),
  );
}

export function ApiReadErrors() {
  return applyDecorators(
    ApiInternalServerErrorResponse({
      description:
        'Error interno del servidor (por ejemplo, MongoDB no disponible)',
      type: StandardErrorResponseDto,
    }),
  );
}

export function ApiResourceReadErrors() {
  return applyDecorators(
    ApiNotFoundResponse({
      description: 'Recurso no encontrado para el identificador indicado',
      type: NotFoundErrorResponseDto,
    }),
    ApiReadErrors(),
  );
}
