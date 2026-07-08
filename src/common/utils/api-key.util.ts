import { timingSafeEqual } from 'crypto';

export function isValidApiKey(provided: unknown, expected: string): boolean {
  if (typeof provided !== 'string' || expected.length === 0) {
    return false;
  }

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}
