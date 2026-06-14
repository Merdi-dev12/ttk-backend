import type { RequestHandler } from 'express';
import { getDatabasePool } from '../config/database.js';
import type { AuthenticatedUser } from '../types/auth.js';
import { AppError } from '../utils/appError.js';
import { verifyAccessToken } from '../utils/jwt.js';

export const authenticate: RequestHandler = async (request, _response, next) => {
  try {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new AppError(401, 'Authentification requise', 'UNAUTHORIZED');
    }

    const payload = verifyAccessToken(authorization.slice(7));
    const result = await getDatabasePool().query<AuthenticatedUser>(
      `SELECT id, email, role, status
       FROM users
       WHERE id = $1`,
      [payload.sub]
    );
    const user = result.rows[0];

    if (!user || user.status === 'REVOKED') {
      throw new AppError(401, 'Compte indisponible', 'ACCOUNT_UNAVAILABLE');
    }

    request.auth = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    next();
  } catch (error) {
    next(error);
  }
};
