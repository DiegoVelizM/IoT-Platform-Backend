import { Logger } from '@nestjs/common';
import { logLevel, type LogEntry } from 'kafkajs';

const logger = new Logger('KafkaJS');

const BENIGN_REBALANCE_PATTERNS = [
  /rebalancing/i,
  /re-joining/i,
  /rejoin is needed/i,
];

function extractErrorDetail(log: LogEntry['log']): string {
  const { error } = log;

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: string }).message ?? '');
  }

  return '';
}

export function isBenignKafkaRebalanceNoise(entry: LogEntry): boolean {
  const message = String(entry.log.message ?? '');
  const errorDetail = extractErrorDetail(entry.log);
  const combined = `${message} ${errorDetail}`;

  return BENIGN_REBALANCE_PATTERNS.some((pattern) => pattern.test(combined));
}

function mapKafkaLogLevel(
  level: logLevel,
): 'error' | 'warn' | 'log' | 'debug' | 'verbose' {
  if (level === logLevel.ERROR) {
    return 'error';
  }

  if (level === logLevel.WARN) {
    return 'warn';
  }

  if (level === logLevel.INFO) {
    return 'log';
  }

  return 'debug';
}

export function createKafkaJsLogCreator() {
  return () => (entry: LogEntry) => {
    const { level, namespace, log } = entry;
    const message = String(log.message ?? '');
    const errorDetail = extractErrorDetail(log);

    if (level === logLevel.ERROR && isBenignKafkaRebalanceNoise(entry)) {
      logger.debug(
        `[${namespace}] ${message}${errorDetail ? ` — ${errorDetail}` : ''}`,
      );
      return;
    }

    const text = `[${namespace}] ${message}${errorDetail ? ` — ${errorDetail}` : ''}`;
    const method = mapKafkaLogLevel(level);
    logger[method](text);
  };
}
