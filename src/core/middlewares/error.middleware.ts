import type { ErrorRequestHandler, RequestHandler } from 'express';
import { config } from '../config/env.js';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    status: 'error',
    code: 'ROUTE_NOT_FOUND',
    message: `Route introuvable: ${request.method} ${request.path}`,
    requestId: response.locals.requestId
  });
};

export const errorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  _next
) => {
  const isOperational = error instanceof AppError;
  const statusCode = isOperational ? error.statusCode : 500;

  if (config.env !== 'test' && (!isOperational || statusCode >= 500)) {
    logger.error('request_error', {
      requestId: response.locals.requestId,
      method: request.method,
      path: request.path,
      statusCode,
      error
    });
  }

  response.status(statusCode).json({
    status: 'error',
    code: isOperational ? error.code : 'INTERNAL_ERROR',
    message:
      isOperational || config.env !== 'production'
        ? error.message
        : 'Une erreur interne est survenue',
    requestId: response.locals.requestId
  });
};
