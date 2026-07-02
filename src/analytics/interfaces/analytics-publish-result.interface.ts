import { ErrorCode } from '../../common/errors/error-codes';

export interface AnalyticsPublishResult {
  success: boolean;
  skipped?: boolean;
  eventType?: string;
  eventId?: string;
  errorCode?: ErrorCode.ANALYTICS_PUBLISH_FAILED;
  errorMessage?: string;
}
