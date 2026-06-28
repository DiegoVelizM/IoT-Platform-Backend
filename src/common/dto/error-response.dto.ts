import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ErrorCode } from '../errors/error-codes';

export class StandardErrorResponseDto {
  @ApiProperty({ example: 500, description: 'Código HTTP del error' })
  statusCode!: number;

  @ApiProperty({
    enum: ErrorCode,
    example: ErrorCode.INTERNAL_ERROR,
    description: 'Código de error estandarizado de la plataforma',
  })
  error!: ErrorCode;

  @ApiProperty({
    oneOf: [
      { type: 'string', example: 'Internal server error' },
      {
        type: 'array',
        items: { type: 'string' },
        example: ['sensorId must be a string'],
      },
    ],
    description: 'Mensaje descriptivo o lista de errores de validación',
  })
  message!: string | string[];

  @ApiProperty({
    example: '2026-06-27T12:00:00.000Z',
    description: 'Marca de tiempo ISO 8601 del error',
  })
  timestamp!: string;

  @ApiProperty({
    example: '/telemetry',
    description: 'Ruta HTTP que originó el error',
  })
  path!: string;
}

export class ValidationErrorResponseDto extends StandardErrorResponseDto {
  @ApiProperty({ example: 400 })
  declare statusCode: number;

  @ApiProperty({ example: ErrorCode.VALIDATION_ERROR, enum: ErrorCode })
  declare error: ErrorCode;

  @ApiProperty({
    example: [
      'sensorId must be a string',
      'sensorType must be one of the following values: thermometer, glucometer, pulse_oximeter, sphygmomanometer',
      'property unknownField should not exist',
    ],
    description: 'Lista de errores de validación del DTO',
  })
  declare message: string[];

  @ApiProperty({ example: '/telemetry' })
  declare path: string;
}

export class NotFoundErrorResponseDto extends StandardErrorResponseDto {
  @ApiProperty({ example: 404 })
  declare statusCode: number;

  @ApiProperty({ example: ErrorCode.NOT_FOUND, enum: ErrorCode })
  declare error: ErrorCode;

  @ApiProperty({
    example: 'Sensor readings not found for identifier "UNKNOWN-001"',
  })
  declare message: string;

  @ApiProperty({ example: '/sensors/sensor/UNKNOWN-001' })
  declare path: string;
}

/** @deprecated Usar StandardErrorResponseDto */
export class HttpErrorResponseDto extends StandardErrorResponseDto {}
