import { logLevel } from 'kafkajs';
import { isBenignKafkaRebalanceNoise } from './kafka-logging';

describe('kafka-logging', () => {
  it('treats rebalance heartbeat errors as benign noise', () => {
    expect(
      isBenignKafkaRebalanceNoise({
        namespace: 'Connection',
        level: logLevel.ERROR,
        label: 'ERROR',
        log: {
          timestamp: '2026-07-09T01:28:14.000Z',
          logger: 'kafkajs',
          message: '[Connection] Response Heartbeat(key: 12, version: 3)',
          error: 'The group is rebalancing, so a rejoin is needed',
        },
      }),
    ).toBe(true);
  });

  it('treats re-joining warnings as benign noise', () => {
    expect(
      isBenignKafkaRebalanceNoise({
        namespace: 'Runner',
        level: logLevel.WARN,
        label: 'WARN',
        log: {
          timestamp: '2026-07-09T01:28:14.000Z',
          logger: 'kafkajs',
          message: '[Runner] The group is rebalancing, re-joining',
        },
      }),
    ).toBe(true);
  });

  it('does not treat unrelated kafka errors as benign noise', () => {
    expect(
      isBenignKafkaRebalanceNoise({
        namespace: 'Connection',
        level: logLevel.ERROR,
        label: 'ERROR',
        log: {
          timestamp: '2026-07-09T01:28:14.000Z',
          logger: 'kafkajs',
          message: '[Connection] Connection timeout',
          error: 'ETIMEDOUT',
        },
      }),
    ).toBe(false);
  });
});
