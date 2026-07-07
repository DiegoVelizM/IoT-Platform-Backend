import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ErrorCode } from '../errors/error-codes';
import {
  INTERNAL_API_KEY_HEADER,
  InternalApiKeyGuard,
} from './internal-api-key.guard';

function createMockContext(
  headers: Record<string, string | string[] | undefined> = {},
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as ExecutionContext;
}

describe('InternalApiKeyGuard', () => {
  const guard = new InternalApiKeyGuard();
  const originalKey = process.env.INTERNAL_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.INTERNAL_API_KEY;
    } else {
      process.env.INTERNAL_API_KEY = originalKey;
    }
  });

  it('allows request when header matches configured key', () => {
    process.env.INTERNAL_API_KEY = 'secret-internal-key';

    expect(
      guard.canActivate(
        createMockContext({ [INTERNAL_API_KEY_HEADER]: 'secret-internal-key' }),
      ),
    ).toBe(true);
  });

  it('rejects request when header is missing or invalid', () => {
    process.env.INTERNAL_API_KEY = 'secret-internal-key';

    expect(() => guard.canActivate(createMockContext({}))).toThrow(
      UnauthorizedException,
    );

    expect(() =>
      guard.canActivate(
        createMockContext({ [INTERNAL_API_KEY_HEADER]: 'wrong-key' }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('returns INTERNAL_API_UNAUTHORIZED when server key is not configured', () => {
    delete process.env.INTERNAL_API_KEY;

    try {
      guard.canActivate(
        createMockContext({ [INTERNAL_API_KEY_HEADER]: 'any' }),
      );
      fail('expected ServiceUnavailableException');
    } catch (error) {
      expect((error as { response: { error: string } }).response.error).toBe(
        ErrorCode.INTERNAL_API_UNAUTHORIZED,
      );
    }
  });
});
