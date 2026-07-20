import cors from 'cors';
import express, {
  type Application,
  type Request
} from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { config } from './core/config/env.js';
import { openApiDocument } from './core/config/swagger.js';
import {
  errorHandler,
  notFoundHandler
} from './core/middlewares/error.middleware.js';
import { requestLogger } from './core/middlewares/requestLogger.middleware.js';
import { rejectSuspiciousRequests } from './core/middlewares/security.middleware.js';
import authRoutes from './modules/auth/routes.js';
import adminRoutes from './modules/admin/routes.js';
import announcementRoutes from './modules/announcements/routes.js';
import catalogRoutes from './modules/catalog/routes.js';
import contactRoutes from './modules/contact/routes.js';
import storageRoutes from './modules/storage/routes.js';
import publicStorageRoutes from './modules/storage/public.routes.js';
import userRoutes from './modules/users/routes.js';
import webhookRoutes from './modules/webhooks/routes.js';

const app: Application = express();
const isCorsWildcard = config.corsOrigin === '*';
const corsOrigins =
  isCorsWildcard
    ? true
    : config.corsOrigin
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(requestLogger);
app.use(rejectSuspiciousRequests);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
app.use(
  cors({
    origin: corsOrigins,
    credentials: !isCorsWildcard,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy'],
    maxAge: 600
  })
);
app.use(
  config.apiPrefix,
  rateLimit({
    windowMs: config.globalRateLimit.windowMs,
    limit: config.globalRateLimit.max,
    standardHeaders: 'draft-8',
    legacyHeaders: false
  })
);
app.use(express.json({
  limit: config.requestBodyLimit,
  verify: (request, _response, buffer) => {
    (request as Request).rawBody = Buffer.from(buffer);
  }
}));
app.use(express.urlencoded({ extended: true, limit: config.requestBodyLimit }));

const swaggerHandler = swaggerUi.setup(openApiDocument, {
  customSiteTitle: 'TTK API Documentation'
});

app.use('/api-docs', swaggerUi.serve);
app.get(['/api-docs', '/api-docs/'], swaggerHandler);
app.get('/api-docs.json', (_request, response) => {
  response.json(openApiDocument);
});

app.use('/storage', publicStorageRoutes);
app.use(`${config.apiPrefix}/storage/public`, publicStorageRoutes);

app.get(`${config.apiPrefix}/health`, (_request, response) => {
  response.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.env
  });
});

app.use(`${config.apiPrefix}/auth`, authRoutes);
app.use(`${config.apiPrefix}/announcements`, announcementRoutes);
app.use(`${config.apiPrefix}/contact`, contactRoutes);
app.use(`${config.apiPrefix}/webhooks`, webhookRoutes);
app.use(`${config.apiPrefix}/admin`, adminRoutes);
app.use(`${config.apiPrefix}/catalog`, catalogRoutes);
app.use(`${config.apiPrefix}/storage/admin`, storageRoutes);
app.use(`${config.apiPrefix}/users/admin`, userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
