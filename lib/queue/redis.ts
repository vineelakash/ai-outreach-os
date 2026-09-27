import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  connectTimeout: 2000,
  retryStrategy(times) {
    // If Redis is unreachable (e.g. during build), do not hang forever
    if (times > 3) {
      return null;
    }
    return Math.min(times * 150, 1000);
  },
});

redisConnection.on('error', (err) => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('[REDIS_CONNECTION_WARNING] Unable to connect to Redis at', redisUrl, err.message);
  }
});
