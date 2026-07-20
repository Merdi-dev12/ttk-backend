import type { UserRole } from '../core/types/auth.js';

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
      auth?: {
        userId: string;
        email: string;
        role: UserRole;
      };
      validated?: {
        body?: unknown;
        params?: unknown;
        query?: unknown;
      };
    }
  }
}

export {};
