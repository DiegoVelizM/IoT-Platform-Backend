import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ErrorCode } from '../../common/errors/error-codes';
import { isValidApiKey } from '../../common/utils/api-key.util';

export const SIMULATION_API_KEY_HEADER = 'x-simulation-key';

@Injectable()
export class SimulationApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedKey = process.env.SIMULATION_API_KEY;

    if (!expectedKey) {
      throw new ServiceUnavailableException({
        error: ErrorCode.SIMULATION_UNAUTHORIZED,
        message:
          'Simulation control is disabled: SIMULATION_API_KEY is not configured on the server',
      });
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers[SIMULATION_API_KEY_HEADER];

    if (!isValidApiKey(providedKey, expectedKey)) {
      throw new UnauthorizedException({
        error: ErrorCode.SIMULATION_UNAUTHORIZED,
        message:
          'Missing or invalid simulation API key. Send header X-Simulation-Key with an authorized value',
      });
    }

    return true;
  }
}
