export type HttpFetchErrorCategory =
  | 'RATE_LIMIT'
  | 'SERVER_ERROR'
  | 'CLIENT_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface ParsedHttpFetchError {
  category: HttpFetchErrorCategory;
  message: string;
  detail?: string;
  statusCode?: number;
}

function extractCauseDetail(err: unknown): string | undefined {
  if (!(err instanceof Error)) {
    return undefined;
  }

  const cause = (err as Error & { cause?: unknown }).cause;

  if (cause instanceof Error) {
    const code = (cause as NodeJS.ErrnoException).code;
    return code ? `${code}: ${cause.message}` : cause.message;
  }

  if (cause && typeof cause === 'object' && 'code' in cause) {
    const code = String((cause as { code: unknown }).code);
    const message =
      'message' in cause ? String((cause as { message: unknown }).message) : '';

    return message ? `${code}: ${message}` : code;
  }

  if (typeof cause === 'string') {
    return cause;
  }

  return undefined;
}

function categorizeNetworkError(
  message: string,
  causeDetail?: string,
): HttpFetchErrorCategory {
  const combined = `${message} ${causeDetail ?? ''}`.toLowerCase();

  if (
    combined.includes('timeout') ||
    combined.includes('etimedout') ||
    combined.includes('connect_timeout')
  ) {
    return 'TIMEOUT';
  }

  if (
    message === 'fetch failed' ||
    combined.includes('econnrefused') ||
    combined.includes('econnreset') ||
    combined.includes('enotfound') ||
    combined.includes('network')
  ) {
    return 'NETWORK_ERROR';
  }

  return 'UNKNOWN';
}

export function parseHttpStatusError(
  statusCode: number,
  body?: string,
): ParsedHttpFetchError {
  if (statusCode === 429) {
    return {
      category: 'RATE_LIMIT',
      message: `HTTP ${statusCode}`,
      detail: body?.trim() || 'Rate limit exceeded',
      statusCode,
    };
  }

  if (statusCode >= 500) {
    return {
      category: 'SERVER_ERROR',
      message: `HTTP ${statusCode}`,
      detail: body?.trim() || undefined,
      statusCode,
    };
  }

  if (statusCode >= 400) {
    return {
      category: 'CLIENT_ERROR',
      message: `HTTP ${statusCode}`,
      detail: body?.trim() || undefined,
      statusCode,
    };
  }

  return {
    category: 'UNKNOWN',
    message: `HTTP ${statusCode}`,
    detail: body?.trim() || undefined,
    statusCode,
  };
}

export function parseHttpFetchError(err: unknown): ParsedHttpFetchError {
  const message = err instanceof Error ? err.message : String(err);
  const causeDetail = extractCauseDetail(err);
  const category = categorizeNetworkError(message, causeDetail);

  return {
    category,
    message,
    detail: causeDetail ?? 'connection failed before HTTP response',
  };
}

export function formatHttpFetchErrorLog(
  targetLabel: string,
  targetUrl: string,
  parsed: ParsedHttpFetchError,
  context?: string,
): string {
  const detail = parsed.detail ?? parsed.message;
  const contextSuffix = context ? ` (${context})` : '';

  return `${targetLabel} publish failed${contextSuffix} [${parsed.category}]: ${detail} → ${targetUrl}`;
}
