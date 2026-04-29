import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedis } from '../config/redis.js';

function createLimiter(options) {
  const config = {
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
      });
    },
    ...options,
  };

  if (process.env.NODE_ENV !== 'production') {
    return (req, res, next) => next();
  }

  // If Redis is available, use RedisStore
  try {
    const redis = getRedis();
    config.store = new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    });
  } catch {
    // fallback to in-memory
  }

  return rateLimit(config);
}

export const generalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  requestPropertyName: 'generalRateLimit',
});

export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100, // Temporarily increased to prevent lockout after the crash
  message: 'Too many authentication attempts.',
  requestPropertyName: 'authRateLimit',
});

export const predictionLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 min
  max: 30,
  requestPropertyName: 'predictionRateLimit',
});

export const pyrosageLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
  requestPropertyName: 'pyrosageRateLimit',
});