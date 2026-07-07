import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ErrorCode } from '../errors/error-codes';

export const INTERNAL_API_KEY_HEADER = 'x-internal-api-key';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!expectedKey) {
      throw new ServiceUnavailableException({
        error: ErrorCode.INTERNAL_API_UNAUTHORIZED,
        message:
          'Manual alert creation is disabled: INTERNAL_API_KEY is not configured on the server',
      });
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers[INTERNAL_API_KEY_HEADER];

    if (typeof providedKey !== 'string' || providedKey !== expectedKey) {
      throw new UnauthorizedException({
        error: ErrorCode.INTERNAL_API_UNAUTHORIZED,
        message:
          'Missing or invalid internal API key. Send header X-Internal-Api-Key with an authorized value',
      });
    }

    return true;
  }
}
