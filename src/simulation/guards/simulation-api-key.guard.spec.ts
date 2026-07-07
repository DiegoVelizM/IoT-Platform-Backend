import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ErrorCode } from '../../common/errors/error-codes';
import {
  SIMULATION_API_KEY_HEADER,
  SimulationApiKeyGuard,
} from './simulation-api-key.guard';

function createMockContext(
  headers: Record<string, string | string[] | undefined> = {},
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as ExecutionContext;
}

describe('SimulationApiKeyGuard', () => {
  const guard = new SimulationApiKeyGuard();
  const originalKey = process.env.SIMULATION_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.SIMULATION_API_KEY;
    } else {
      process.env.SIMULATION_API_KEY = originalKey;
    }
  });

  it('allows request when header matches configured key', () => {
    process.env.SIMULATION_API_KEY = 'secret-simulation-key';

    expect(
      guard.canActivate(
        createMockContext({
          [SIMULATION_API_KEY_HEADER]: 'secret-simulation-key',
        }),
      ),
    ).toBe(true);
  });

  it('rejects request when header is missing or invalid', () => {
    process.env.SIMULATION_API_KEY = 'secret-simulation-key';

    try {
      guard.canActivate(createMockContext({}));
      fail('expected UnauthorizedException');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toMatchObject({
        error: ErrorCode.SIMULATION_UNAUTHORIZED,
      });
    }
  });

  it('rejects array header values', () => {
    process.env.SIMULATION_API_KEY = 'secret-simulation-key';

    expect(() =>
      guard.canActivate(
        createMockContext({
          [SIMULATION_API_KEY_HEADER]: ['secret-simulation-key'],
        }),
      ),
    ).toThrow(UnauthorizedException);
  });
});
