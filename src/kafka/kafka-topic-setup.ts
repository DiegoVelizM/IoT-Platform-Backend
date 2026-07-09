export function findMissingKafkaTopics(
  requiredTopics: string[],
  existingTopics: string[],
): string[] {
  const existing = new Set(existingTopics);

  return requiredTopics.filter((topic) => !existing.has(topic));
}
