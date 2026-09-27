interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// In-memory sliding window cache for local development/fallback
const memoryWindow = new Map<string, { timestamp: number; count: number }>();

export async function rateLimit(
  identifier: string,
  limit: number = 60,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const current = memoryWindow.get(identifier);

  if (!current || now - current.timestamp > windowMs) {
    memoryWindow.set(identifier, { timestamp: now, count: 1 });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + windowMs,
    };
  }

  if (current.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: current.timestamp + windowMs,
    };
  }

  current.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - current.count,
    reset: current.timestamp + windowMs,
  };
}
