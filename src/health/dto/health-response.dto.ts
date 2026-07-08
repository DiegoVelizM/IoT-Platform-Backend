import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ErrorCode } from '../../common/errors/error-codes';

class KafkaConsumerHealthDto {
  @ApiProperty({
    example: true,
    description: 'Estado de la conexión del consumidor Kafka',
  })
  connected!: boolean;

  @ApiProperty({ example: 'iot-platform-consumer' })
  groupId!: string;

  @ApiProperty({
    example: 42,
    description: 'Mensajes consumidos desde el arranque del proceso',
  })
  messagesConsumed!: number;

  @ApiPropertyOptional({
    example: 'Connection refused',
    description: 'Último error registrado del consumidor Kafka',
  })
  lastError?: string;

  @ApiPropertyOptional({
    enum: [ErrorCode.KAFKA_CONNECTION_FAILED],
    example: ErrorCode.KAFKA_CONNECTION_FAILED,
  })
  lastErrorCode?: ErrorCode.KAFKA_CONNECTION_FAILED;
}

class KafkaHealthDto {
  @ApiProperty({
    example: true,
    description: 'Estado de la conexión del productor Kafka',
  })
  connected!: boolean;

  @ApiProperty({ example: 'kafka:9092' })
  broker!: string;

  @ApiPropertyOptional({
    example: 'cloud',
    enum: ['local', 'cloud'],
    description: 'local = Docker Compose; cloud = Confluent Cloud (SASL/SSL)',
  })
  mode?: 'local' | 'cloud';

  @ApiPropertyOptional({
    example: 'Connection refused',
    description: 'Último error registrado del productor Kafka',
  })
  lastError?: string;

  @ApiPropertyOptional({
    enum: [ErrorCode.KAFKA_CONNECTION_FAILED, ErrorCode.KAFKA_PUBLISH_FAILED],
    example: ErrorCode.KAFKA_CONNECTION_FAILED,
  })
  lastErrorCode?: ErrorCode.KAFKA_CONNECTION_FAILED | ErrorCode.KAFKA_PUBLISH_FAILED;

  @ApiProperty({ type: KafkaConsumerHealthDto })
  consumer!: KafkaConsumerHealthDto;
}

export class HealthResponseDto {
  @ApiProperty({
    example: 'ok',
    enum: ['ok', 'degraded'],
    description: 'Estado general: degraded si MongoDB o Kafka no están disponibles',
  })
  status!: 'ok' | 'degraded';

  @ApiProperty({ example: 'iot-platform-backend' })
  service!: string;

  @ApiProperty({
    example: 'connected',
    enum: ['connected', 'disconnected'],
    description: 'Estado de la conexión a MongoDB',
  })
  database!: 'connected' | 'disconnected';

  @ApiProperty({ type: KafkaHealthDto })
  kafka!: KafkaHealthDto;

  @ApiProperty({ example: '2026-06-27T12:00:00.000Z' })
  timestamp!: string;
}
