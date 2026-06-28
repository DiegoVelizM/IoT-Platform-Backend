import { NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../errors/error-codes';

export class ResourceNotFoundException extends NotFoundException {
  constructor(resource: string, identifier: string) {
    super({
      error: ErrorCode.NOT_FOUND,
      message: `${resource} not found for identifier "${identifier}"`,
    });
  }
}
