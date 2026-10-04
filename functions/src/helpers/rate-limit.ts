export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  prefix?: string;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory sliding window cache as fast layer and fallback
const memoryCache = new Map<string, RateLimitRecord>();

/**
 * Validates request frequency for a given client identifier (uid or IP).
 * Returns true if the request is within rate limit, false if exceeded.
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions,
): Promise<boolean> {
  const { maxRequests, windowMs, prefix = "global" } = options;
  const key = `${prefix}:${identifier}`;
  const now = Date.now();

  const record = memoryCache.get(key);

  if (!record || record.resetAt <= now) {
    memoryCache.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count += 1;
  return true;
}

/** Resets rate limit records (primarily for testing). */
export function resetRateLimits(): void {
  memoryCache.clear();
}
