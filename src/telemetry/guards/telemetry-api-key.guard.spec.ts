import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ErrorCode } from '../../common/errors/error-codes';
import { INTERNAL_API_KEY_HEADER } from '../../common/guards/internal-api-key.guard';
import {
  TELEMETRY_API_KEY_HEADER,
  TelemetryApiKeyGuard,
} from './telemetry-api-key.guard';

function createMockContext(
  headers: Record<string, string | string[] | undefined> = {},
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as ExecutionContext;
}

describe('TelemetryApiKeyGuard', () => {
  const guard = new TelemetryApiKeyGuard();
  const originalTelemetryKey = process.env.TELEMETRY_API_KEY;
  const originalInternalKey = process.env.INTERNAL_API_KEY;

  afterEach(() => {
    if (originalTelemetryKey === undefined) {
      delete process.env.TELEMETRY_API_KEY;
    } else {
      process.env.TELEMETRY_API_KEY = originalTelemetryKey;
    }

    if (originalInternalKey === undefined) {
      delete process.env.INTERNAL_API_KEY;
    } else {
      process.env.INTERNAL_API_KEY = originalInternalKey;
    }
  });

  it('allows request when X-Telemetry-Key matches configured key', () => {
    process.env.TELEMETRY_API_KEY = 'secret-telemetry-key';

    expect(
      guard.canActivate(
        createMockContext({
          [TELEMETRY_API_KEY_HEADER]: 'secret-telemetry-key',
        }),
      ),
    ).toBe(true);
  });

  it('allows request when X-Internal-Api-Key matches configured internal key', () => {
    process.env.INTERNAL_API_KEY = 'secret-internal-key';

    expect(
      guard.canActivate(
        createMockContext({
          [INTERNAL_API_KEY_HEADER]: 'secret-internal-key',
        }),
      ),
    ).toBe(true);
  });

  it('rejects request when header is missing or invalid', () => {
    process.env.TELEMETRY_API_KEY = 'secret-telemetry-key';

    expect(() => guard.canActivate(createMockContext({}))).toThrow(
      UnauthorizedException,
    );

    expect(() =>
      guard.canActivate(
        createMockContext({
          [TELEMETRY_API_KEY_HEADER]: 'wrong-key',
        }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('returns TELEMETRY_UNAUTHORIZED when no server keys are configured', () => {
    delete process.env.TELEMETRY_API_KEY;
    delete process.env.INTERNAL_API_KEY;

    try {
      guard.canActivate(
        createMockContext({
          [TELEMETRY_API_KEY_HEADER]: 'any',
        }),
      );
      fail('expected ServiceUnavailableException');
    } catch (error) {
      expect((error as { response: { error: string } }).response.error).toBe(
        ErrorCode.TELEMETRY_UNAUTHORIZED,
      );
    }
  });
});
