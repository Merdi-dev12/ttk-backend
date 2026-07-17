import type { RequestHandler } from 'express';
import { AppError } from '../utils/appError.js';

const pathTraversalPattern = /(?:^|[/\\])\.\.(?:[/\\]|$)|%2e%2e|%252e%252e/i;

export const rejectSuspiciousRequests: RequestHandler = (request, _response, next) => {
  if (pathTraversalPattern.test(request.originalUrl)) {
    next(new AppError(400, 'Requete invalide', 'SUSPICIOUS_REQUEST'));
    return;
  }

  next();
};
