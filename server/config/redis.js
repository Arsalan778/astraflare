import Redis from 'ioredis';
import logger from './logger.js';

let redis = null;

export function getRedis() {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB, 10) || 0,
      maxRetriesPerRequest: null, // required by BullMQ
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
    });

    redis.on('connect', () => logger.info('✅  Redis connected'));
    redis.on('error', (err) => logger.error('Redis error', err));
  }
  return redis;
}

export async function connectRedis() {
  const client = getRedis();
  try {
    await client.ping();
    return client;
  } catch (err) {
    logger.warn('Redis unavailable – running without Redis (in-memory fallbacks active). Error: ' + err.message);
    return null;
  }
}