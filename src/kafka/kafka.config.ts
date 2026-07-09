import { KafkaConfig, SASLOptions } from 'kafkajs';
import { createKafkaJsLogCreator } from './kafka-logging';

const DEFAULT_BROKER = 'kafka:9092';
const DEFAULT_CLIENT_ID = 'iot-platform-backend';

export type KafkaConnectionMode = 'local' | 'cloud';

export interface ResolvedKafkaConfig {
  brokers: string[];
  clientId: string;
  mode: KafkaConnectionMode;
  kafkaConfig: KafkaConfig;
}

function resolveSaslMechanism():
  | 'plain'
  | 'scram-sha-256'
  | 'scram-sha-512' {
  const mechanism = process.env.KAFKA_SASL_MECHANISM?.toLowerCase();

  if (mechanism === 'plain') {
    return 'plain';
  }

  if (mechanism === 'scram-sha-512') {
    return 'scram-sha-512';
  }

  return 'scram-sha-256';
}

export function resolveKafkaConfig(): ResolvedKafkaConfig {
  const broker = process.env.KAFKA_BROKER ?? DEFAULT_BROKER;
  const username = process.env.KAFKA_USERNAME;
  const password = process.env.KAFKA_PASSWORD;
  const clientId = process.env.KAFKA_CLIENT_ID ?? DEFAULT_CLIENT_ID;
  const isCloud = Boolean(username && password);

  const baseConfig: KafkaConfig = {
    clientId,
    brokers: [broker],
    retry: { retries: 5 },
    connectionTimeout: isCloud ? 10_000 : 5_000,
    requestTimeout: isCloud ? 30_000 : 5_000,
    logCreator: createKafkaJsLogCreator(),
  };

  if (!isCloud) {
    return {
      brokers: [broker],
      clientId,
      mode: 'local',
      kafkaConfig: baseConfig,
    };
  }

  const sasl: SASLOptions = {
    mechanism: resolveSaslMechanism(),
    username: username!,
    password: password!,
  };

  return {
    brokers: [broker],
    clientId,
    mode: 'cloud',
    kafkaConfig: {
      ...baseConfig,
      ssl: true,
      sasl,
    },
  };
}
