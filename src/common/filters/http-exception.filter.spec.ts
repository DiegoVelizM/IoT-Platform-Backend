import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../errors/error-codes';
import { HttpExceptionFilter } from './http-exception.filter';

function createMockHost(url = '/test'): {
  host: ArgumentsHost;
  json: jest.Mock;
  status: jest.Mock;
} {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });

  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status, json }),
      getRequest: () => ({ method: 'GET', url }),
    }),
  } as ArgumentsHost;

  return { host, json, status };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  it('maps validation errors to VALIDATION_ERROR', () => {
    const { host, json, status } = createMockHost('/sensors');

    filter.catch(
      new HttpException({ message: ['sensorId is required'] }, HttpStatus.BAD_REQUEST),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        error: ErrorCode.VALIDATION_ERROR,
        path: '/sensors',
      }),
    );
  });

  it('preserves explicit SIMULATION_UNAUTHORIZED error code', () => {
    const { host, json } = createMockHost('/simulation/start');

    filter.catch(
      new HttpException(
        {
          error: ErrorCode.SIMULATION_UNAUTHORIZED,
          message: 'Invalid simulation key',
        },
        HttpStatus.UNAUTHORIZED,
      ),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: ErrorCode.SIMULATION_UNAUTHORIZED,
      }),
    );
  });

  it('preserves explicit INTERNAL_API_UNAUTHORIZED error code', () => {
    const { host, json } = createMockHost('/alerts');

    filter.catch(
      new HttpException(
        {
          error: ErrorCode.INTERNAL_API_UNAUTHORIZED,
          message: 'Invalid internal key',
        },
        HttpStatus.UNAUTHORIZED,
      ),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: ErrorCode.INTERNAL_API_UNAUTHORIZED,
      }),
    );
  });
});
