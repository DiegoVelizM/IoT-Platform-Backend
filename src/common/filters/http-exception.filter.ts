import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../errors/error-codes';
import { StandardErrorResponse } from '../interfaces/standard-error-response.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = ErrorCode.INTERNAL_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const payload = exceptionResponse as Record<string, unknown>;

        if (payload.message !== undefined) {
          message = payload.message as string | string[];
        }

        if (
          typeof payload.error === 'string' &&
          Object.values(ErrorCode).includes(payload.error as ErrorCode)
        ) {
          errorCode = payload.error as ErrorCode;
        }
      }

      if (errorCode === ErrorCode.INTERNAL_ERROR) {
        errorCode = this.resolveErrorCode(statusCode);
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception.stack,
      );
    } else {
      this.logger.error(`Unhandled exception on ${request.method} ${request.url}`);
    }

    const body: StandardErrorResponse = {
      statusCode,
      error: errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(body);
  }

  private resolveErrorCode(statusCode: number): ErrorCode {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_ERROR;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}
