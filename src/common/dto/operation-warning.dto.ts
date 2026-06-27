import { ApiProperty } from '@nestjs/swagger';
import { ErrorCode } from '../errors/error-codes';

export class OperationWarningDto {
  @ApiProperty({
    enum: ErrorCode,
    example: ErrorCode.KAFKA_PUBLISH_FAILED,
  })
  code!: ErrorCode;

  @ApiProperty({
    example: 'Failed to publish event to topic telemetry_received',
  })
  message!: string;

  @ApiProperty({
    example: 'telemetry_received',
    required: false,
  })
  topic?: string;
}
