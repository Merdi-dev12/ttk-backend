import cors from 'cors';
import express, {
  type Application,
  type ErrorRequestHandler,
  type RequestHandler
} from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { config } from './core/config/env.js';
import { openApiDocument } from './core/config/swagger.js';

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

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'TTK API Documentation'
  })
);
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

const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    status: 'error',
    message: `Route not found: ${request.method} ${request.originalUrl}`
  });
};

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const statusCode =
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
      ? error.statusCode
      : 500;
  const message =
    config.env !== 'production' && error instanceof Error
      ? error.message
      : 'Internal server error';

  if (config.env !== 'test') {
    console.error(error);
  }

  response.status(statusCode).json({
    status: 'error',
    message
  });
};

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
