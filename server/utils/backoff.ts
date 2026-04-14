/**
 * Exponential backoff retry logic
 */
export function getBackoffMs(attempt: number, baseMs: number = 1000): number {
  // 2^attempt * baseMs with jitter
  const exponential = Math.pow(2, attempt) * baseMs;
  const jitter = Math.random() * 0.1 * exponential; // ±10%
  return exponential + jitter;
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  // 429 = Too Many Requests
  // 500, 502, 503, 504 = Server errors
  const err = error as any;

  if (err.status === 429 || err.response?.status === 429) {
    return true;
  }

  const status = err.response?.status || err.status;
  return [500, 502, 503, 504].includes(status);
}

export default { getBackoffMs, isRetryableError };
