import { Redis } from 'ioredis';
import { config } from './env.js';

let redisClient: Redis | undefined;

export function getRedisClient(): Redis {
  if (!config.redisUrl) {
    throw new Error('REDIS_URL is required to use Redis');
  }

  if (!/^rediss?:\/\//.test(config.redisUrl)) {
    throw new Error('REDIS_URL must be a valid Redis connection URL');
  }

  redisClient ??= new Redis(config.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null
  });

  return redisClient;
}

export function getRedisConnectionOptions(): {
  host: string;
  port: number;
  username?: string;
  password?: string;
  tls?: Record<string, never>;
  maxRetriesPerRequest: null;
} {
  if (!config.redisUrl) {
    throw new Error('REDIS_URL is required to use Redis');
  }

  const url = new URL(config.redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    tls: url.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null
  };
}

export function closeRedis(): void {
  redisClient?.disconnect();
  redisClient = undefined;
}
