import rateLimit from 'express-rate-limit';

// import RedisStore from 'rate-limit-redis';
// import Redis from 'ioredis';
// import { env } from '../config/env.js';
//
// const redisClient = new Redis(env.REDIS_URL);
//
// const redisStore = new RedisStore({
//   sendCommand: (...args: string[]) => redisClient.call(...args),
// });

export const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Too many requests, please try again later' },
  },
  // store: redisStore,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Too many authentication attempts, please try again later' },
  },
  // store: redisStore,
});
