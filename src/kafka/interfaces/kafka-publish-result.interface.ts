import { ErrorCode } from '../../common/errors/error-codes';

export interface KafkaPublishResult {
  success: boolean;
  topic: string;
  errorCode?: ErrorCode.KAFKA_CONNECTION_FAILED | ErrorCode.KAFKA_PUBLISH_FAILED;
  errorMessage?: string;
}

export interface KafkaHealthStatus {
  connected: boolean;
  broker: string;
  mode?: 'local' | 'cloud';
  lastError?: string;
  lastErrorCode?: ErrorCode.KAFKA_CONNECTION_FAILED | ErrorCode.KAFKA_PUBLISH_FAILED;
}
