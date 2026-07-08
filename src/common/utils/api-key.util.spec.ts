import { isValidApiKey } from './api-key.util';

describe('isValidApiKey', () => {
  it('returns true for matching keys', () => {
    expect(isValidApiKey('secret-key', 'secret-key')).toBe(true);
  });

  it('returns false for mismatched keys', () => {
    expect(isValidApiKey('wrong-key', 'secret-key')).toBe(false);
  });

  it('returns false for non-string provided values', () => {
    expect(isValidApiKey(['secret-key'], 'secret-key')).toBe(false);
  });

  it('returns false when expected key is empty', () => {
    expect(isValidApiKey('secret-key', '')).toBe(false);
  });
});
