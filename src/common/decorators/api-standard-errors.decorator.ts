import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import {
  HttpErrorResponseDto,
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
      type: HttpErrorResponseDto,
    }),
  );
}

export function ApiReadErrors() {
  return applyDecorators(
    ApiInternalServerErrorResponse({
      description:
        'Error interno del servidor (por ejemplo, MongoDB no disponible)',
      type: HttpErrorResponseDto,
    }),
  );
}
