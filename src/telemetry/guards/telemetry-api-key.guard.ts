import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { INTERNAL_API_KEY_HEADER } from '../../common/guards/internal-api-key.guard';
import { ErrorCode } from '../../common/errors/error-codes';
import { isValidApiKey } from '../../common/utils/api-key.util';

export const TELEMETRY_API_KEY_HEADER = 'x-telemetry-key';

@Injectable()
export class TelemetryApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const telemetryKey = process.env.TELEMETRY_API_KEY;
    const internalKey = process.env.INTERNAL_API_KEY;

    if (!telemetryKey && !internalKey) {
      throw new ServiceUnavailableException({
        error: ErrorCode.TELEMETRY_UNAUTHORIZED,
        message:
          'Telemetry ingestion is disabled: TELEMETRY_API_KEY or INTERNAL_API_KEY must be configured on the server',
      });
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedTelemetryKey = request.headers[TELEMETRY_API_KEY_HEADER];
    const providedInternalKey = request.headers[INTERNAL_API_KEY_HEADER];

    if (telemetryKey && isValidApiKey(providedTelemetryKey, telemetryKey)) {
      return true;
    }

    if (internalKey && isValidApiKey(providedInternalKey, internalKey)) {
      return true;
    }

    throw new UnauthorizedException({
      error: ErrorCode.TELEMETRY_UNAUTHORIZED,
      message:
        'Missing or invalid telemetry API key. Send header X-Telemetry-Key or X-Internal-Api-Key with an authorized value',
    });
  }
}
