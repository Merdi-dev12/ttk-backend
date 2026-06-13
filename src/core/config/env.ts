import 'dotenv/config';
import Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  HOST: Joi.string().default('0.0.0.0'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().pattern(/^\/[a-zA-Z0-9/_-]*$/).default('/api/v1'),
  CORS_ORIGIN: Joi.string().default('*'),
  DATABASE_URL: Joi.string().uri().optional(),
  REDIS_URL: Joi.string().uri().optional(),
  MEILI_HOST: Joi.string().uri().optional(),
  MEILI_MASTER_KEY: Joi.string().optional(),
  JWT_SECRET: Joi.string().min(32).optional()
})
  .unknown(true)
  .required();

const { value, error } = envSchema.validate(process.env, {
  abortEarly: false,
  convert: true
});

if (error) {
  throw new Error(`Invalid environment configuration: ${error.message}`);
}

const env = value as {
  NODE_ENV: 'development' | 'production' | 'test';
  HOST: string;
  PORT: number;
  API_PREFIX: string;
  CORS_ORIGIN: string;
  DATABASE_URL?: string;
  REDIS_URL?: string;
  MEILI_HOST?: string;
  MEILI_MASTER_KEY?: string;
  JWT_SECRET?: string;
};

export const config = Object.freeze({
  env: env.NODE_ENV,
  host: env.HOST,
  port: env.PORT,
  apiPrefix: env.API_PREFIX,
  corsOrigin: env.CORS_ORIGIN,
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  meilisearch: {
    host: env.MEILI_HOST,
    masterKey: env.MEILI_MASTER_KEY
  },
  jwtSecret: env.JWT_SECRET
});
