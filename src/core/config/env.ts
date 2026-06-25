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
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),
  DATABASE_URL: Joi.string().empty('').optional(),
  REDIS_URL: Joi.string().empty('').optional(),
  MEILI_HOST: Joi.string().empty('').optional(),
  MEILI_MASTER_KEY: Joi.string().empty('').optional(),
  STORAGE_ENDPOINT: Joi.string().uri().empty('').optional(),
  STORAGE_REGION: Joi.string().default('us-east-1'),
  STORAGE_BUCKET_PREFIX: Joi.string()
    .pattern(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)
    .max(12)
    .default('ttk'),
  STORAGE_ACCESS_KEY: Joi.string().min(3).empty('').optional(),
  STORAGE_SECRET_KEY: Joi.string().min(8).empty('').optional(),
  STORAGE_FORCE_PATH_STYLE: Joi.boolean().default(true),
  STORAGE_PUBLIC_BASE_URL: Joi.string().uri().empty('').optional(),
  STORAGE_MAX_FILE_SIZE_MB: Joi.number().integer().min(1).max(50).default(10),
  JWT_SECRET: Joi.string().min(32).empty('').optional(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: Joi.number().integer().min(1).default(30),
  OTP_TTL_MINUTES: Joi.number().integer().min(1).max(60).default(10),
  OTP_MAX_ATTEMPTS: Joi.number().integer().min(1).max(10).default(5),
  BCRYPT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),
  AUTH_RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1000).default(900000),
  AUTH_RATE_LIMIT_MAX: Joi.number().integer().min(1).default(20),
  SMTP_HOST: Joi.string().empty('').optional(),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().empty('').optional(),
  SMTP_PASS: Joi.string().empty('').optional(),
  MAIL_FROM: Joi.string().email().empty('').optional(),
  MAIL_FROM_NAME: Joi.string().min(2).max(100).default('TTK Services'),
  MAIL_BRAND_NAME: Joi.string().min(2).max(100).default('TTK Services'),
  MAIL_LOGO_URL: Joi.string().uri().empty('').optional(),
  MAIL_SUPPORT_EMAIL: Joi.string().email().empty('').optional(),
  GOOGLE_CLIENT_ID: Joi.string()
    .pattern(/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/)
    .empty('').optional(),
  ADMIN_EMAIL: Joi.string().email().empty('').optional(),
  ADMIN_NAME: Joi.string().min(2).max(100).empty('').optional(),
  ADMIN_PASSWORD: Joi.string().min(8).max(72).empty('').optional()
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
  FRONTEND_URL: string;
  DATABASE_URL?: string;
  REDIS_URL?: string;
  MEILI_HOST?: string;
  MEILI_MASTER_KEY?: string;
  STORAGE_ENDPOINT?: string;
  STORAGE_REGION: string;
  STORAGE_BUCKET_PREFIX: string;
  STORAGE_ACCESS_KEY?: string;
  STORAGE_SECRET_KEY?: string;
  STORAGE_FORCE_PATH_STYLE: boolean;
  STORAGE_PUBLIC_BASE_URL?: string;
  STORAGE_MAX_FILE_SIZE_MB: number;
  JWT_SECRET?: string;
  JWT_ACCESS_TTL: string;
  JWT_REFRESH_TTL_DAYS: number;
  OTP_TTL_MINUTES: number;
  OTP_MAX_ATTEMPTS: number;
  BCRYPT_ROUNDS: number;
  AUTH_RATE_LIMIT_WINDOW_MS: number;
  AUTH_RATE_LIMIT_MAX: number;
  SMTP_HOST?: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  MAIL_FROM?: string;
  MAIL_FROM_NAME: string;
  MAIL_BRAND_NAME: string;
  MAIL_LOGO_URL?: string;
  MAIL_SUPPORT_EMAIL?: string;
  GOOGLE_CLIENT_ID?: string;
  ADMIN_EMAIL?: string;
  ADMIN_NAME?: string;
  ADMIN_PASSWORD?: string;
};

export const config = Object.freeze({
  env: env.NODE_ENV,
  host: env.HOST,
  port: env.PORT,
  apiPrefix: env.API_PREFIX,
  corsOrigin: env.CORS_ORIGIN,
  frontendUrl: env.FRONTEND_URL,
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  meilisearch: {
    host: env.MEILI_HOST,
    masterKey: env.MEILI_MASTER_KEY
  },
  storage: {
    endpoint: env.STORAGE_ENDPOINT,
    region: env.STORAGE_REGION,
    bucketPrefix: env.STORAGE_BUCKET_PREFIX,
    accessKey: env.STORAGE_ACCESS_KEY,
    secretKey: env.STORAGE_SECRET_KEY,
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
    publicBaseUrl: env.STORAGE_PUBLIC_BASE_URL,
    maxFileSizeBytes: env.STORAGE_MAX_FILE_SIZE_MB * 1024 * 1024
  },
  auth: {
    jwtSecret: env.JWT_SECRET,
    accessTtl: env.JWT_ACCESS_TTL,
    refreshTtlDays: env.JWT_REFRESH_TTL_DAYS,
    otpTtlMinutes: env.OTP_TTL_MINUTES,
    otpMaxAttempts: env.OTP_MAX_ATTEMPTS,
    bcryptRounds: env.BCRYPT_ROUNDS,
    rateLimitWindowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
    rateLimitMax: env.AUTH_RATE_LIMIT_MAX
  },
  mail: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    password: env.SMTP_PASS,
    from: env.MAIL_FROM,
    fromName: env.MAIL_FROM_NAME,
    brandName: env.MAIL_BRAND_NAME,
    logoUrl: env.MAIL_LOGO_URL,
    supportEmail: env.MAIL_SUPPORT_EMAIL,
    adminEmail: env.ADMIN_EMAIL
  },
  google: {
    clientId: env.GOOGLE_CLIENT_ID
  },
  adminBootstrap: {
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD
  }
});
