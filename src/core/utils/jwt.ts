import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config/env.js';
import type { UserRole } from '../types/auth.js';
import { AppError } from './appError.js';

interface AccessPayload extends jwt.JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access';
}

function getAccessSecret(): string {
  if (!config.auth.jwtSecret) {
    throw new Error('JWT_SECRET is required to use authentication');
  }

  return config.auth.jwtSecret;
}

export function signAccessToken(user: {
  id: string;
  email: string;
  role: UserRole;
}): string {
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
      type: 'access'
    },
    getAccessSecret(),
    {
      subject: user.id,
      expiresIn: config.auth.accessTtl as SignOptions['expiresIn']
    }
  );
}

export function verifyAccessToken(token: string): AccessPayload {
  try {
    const payload = jwt.verify(token, getAccessSecret());

    if (
      typeof payload === 'string' ||
      payload.type !== 'access' ||
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      (payload.role !== 'USER' && payload.role !== 'ADMIN')
    ) {
      throw new Error('Invalid access token payload');
    }

    return payload as AccessPayload;
  } catch {
    throw new AppError(401, 'Jeton invalide ou expiré', 'INVALID_TOKEN');
  }
}
