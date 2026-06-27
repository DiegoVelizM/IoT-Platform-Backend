import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: 'iot-platform-backend' })
  service!: string;

  @ApiProperty({
    example: 'connected',
    enum: ['connected', 'disconnected'],
    description: 'Estado de la conexión a MongoDB',
  })
  database!: 'connected' | 'disconnected';

  @ApiProperty({ example: '2026-06-27T12:00:00.000Z' })
  timestamp!: string;
}
