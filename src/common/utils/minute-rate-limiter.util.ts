/** Ventana deslizante de 60 s para limitar operaciones por minuto. */
export class MinuteRateLimiter {
  private timestamps: number[] = [];

  constructor(private readonly maxPerMinute: number) {}

  tryAcquire(now = Date.now()): boolean {
    if (this.maxPerMinute <= 0) {
      return true;
    }

    const windowStart = now - 60_000;
    this.timestamps = this.timestamps.filter((timestamp) => timestamp > windowStart);

    if (this.timestamps.length >= this.maxPerMinute) {
      return false;
    }

    this.timestamps.push(now);
    return true;
  }
}

export function resolvePositiveIntEnv(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}
