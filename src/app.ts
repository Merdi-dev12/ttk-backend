import cors from 'cors';
import express, {
  type Application
} from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { config } from './core/config/env.js';
import { openApiDocument } from './core/config/swagger.js';
import {
  errorHandler,
  notFoundHandler
} from './core/middlewares/error.middleware.js';
import authRoutes from './modules/auth/routes.js';
import catalogRoutes from './modules/catalog/routes.js';
import userRoutes from './modules/users/routes.js';

const app: Application = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const swaggerHandler = swaggerUi.setup(openApiDocument, {
  customSiteTitle: 'TTK API Documentation'
});

for (const docsPath of ['/docs', '/api-docs']) {
  app.use(docsPath, swaggerUi.serve);
  app.get([docsPath, `${docsPath}/`], swaggerHandler);
}
app.get('/docs.json', (_request, response) => {
  response.json(openApiDocument);
});

app.get(`${config.apiPrefix}/health`, (_request, response) => {
  response.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.env
  });
});

app.use(`${config.apiPrefix}/auth`, authRoutes);
app.use(`${config.apiPrefix}/catalog`, catalogRoutes);
app.use(`${config.apiPrefix}/users/admin`, userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
