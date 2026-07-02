import { ErrorCode } from '../../common/errors/error-codes';

export interface IncidentsPublishResult {
  success: boolean;
  skipped?: boolean;
  errorCode?: ErrorCode.INCIDENTS_PUBLISH_FAILED;
  errorMessage?: string;
}
