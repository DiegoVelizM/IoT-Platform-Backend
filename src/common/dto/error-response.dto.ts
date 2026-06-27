import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HttpErrorResponseDto {
  @ApiProperty({ example: 500, description: 'Código HTTP del error' })
  statusCode!: number;

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

  @ApiPropertyOptional({
    example: 'Internal Server Error',
    description: 'Nombre corto del error HTTP',
  })
  error?: string;
}

export class ValidationErrorResponseDto extends HttpErrorResponseDto {
  @ApiProperty({ example: 400 })
  declare statusCode: number;

  @ApiProperty({
    example: [
      'sensorId must be a string',
      'sensorType must be one of the following values: thermometer, glucometer, pulse_oximeter, sphygmomanometer',
      'property unknownField should not exist',
    ],
    description: 'Lista de errores de validación del DTO',
  })
  declare message: string[];

  @ApiProperty({ example: 'Bad Request' })
  declare error: string;
}
