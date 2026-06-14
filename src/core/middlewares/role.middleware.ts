import type { RequestHandler } from 'express';
import type { UserRole } from '../types/auth.js';
import { AppError } from '../utils/appError.js';

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth || !roles.includes(request.auth.role)) {
      return next(new AppError(403, 'Accès interdit', 'FORBIDDEN'));
    }

    next();
  };
}
