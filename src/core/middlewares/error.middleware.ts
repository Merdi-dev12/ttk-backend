import type { ErrorRequestHandler, RequestHandler } from 'express';
import { config } from '../config/env.js';
import { AppError } from '../utils/appError.js';

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    status: 'error',
    code: 'ROUTE_NOT_FOUND',
    message: `Route introuvable: ${request.method} ${request.originalUrl}`
  });
};

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next
) => {
  const isOperational = error instanceof AppError;
  const statusCode = isOperational ? error.statusCode : 500;

  if (!isOperational && config.env !== 'test') {
    console.error(error);
  }

  response.status(statusCode).json({
    status: 'error',
    code: isOperational ? error.code : 'INTERNAL_ERROR',
    message:
      isOperational || config.env !== 'production'
        ? error.message
        : 'Une erreur interne est survenue'
  });
};
