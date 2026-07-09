import { findMissingKafkaTopics } from './kafka-topic-setup';
import { KAFKA_TOPICS } from './kafka-topics.constants';

describe('kafka-topic-setup', () => {
  it('returns all required topics when none exist yet', () => {
    const required = Object.values(KAFKA_TOPICS);

    expect(findMissingKafkaTopics(required, [])).toEqual(required);
  });

  it('returns only topics that are missing', () => {
    expect(
      findMissingKafkaTopics(
        Object.values(KAFKA_TOPICS),
        [KAFKA_TOPICS.TELEMETRY_RECEIVED, KAFKA_TOPICS.ALERT_GENERATED],
      ),
    ).toEqual([KAFKA_TOPICS.SENSOR_OFFLINE]);
  });

  it('returns an empty list when all topics already exist', () => {
    expect(
      findMissingKafkaTopics(Object.values(KAFKA_TOPICS), Object.values(KAFKA_TOPICS)),
    ).toEqual([]);
  });
});
