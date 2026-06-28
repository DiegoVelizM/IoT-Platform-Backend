import { ErrorCode } from '../errors/error-codes';

export interface StandardErrorResponse {
  statusCode: number;
  error: ErrorCode;
  message: string | string[];
  timestamp: string;
  path: string;
}
