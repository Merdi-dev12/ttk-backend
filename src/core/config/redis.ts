import { Redis } from 'ioredis';
import { config } from './env.js';

let redisClient: Redis | undefined;

export function getRedisClient(): Redis {
  if (!config.redisUrl) {
    throw new Error('REDIS_URL is required to use Redis');
  }

  redisClient ??= new Redis(config.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null
  });

  return redisClient;
}

export function closeRedis(): void {
  redisClient?.disconnect();
  redisClient = undefined;
}
