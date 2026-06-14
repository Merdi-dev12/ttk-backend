import { getDatabasePool } from '../../core/config/database.js';
import type { UserRole, UserStatus } from '../../core/types/auth.js';
import { AppError } from '../../core/utils/appError.js';

export interface PublicUser {
  id: string;
  nom: string;
  postnom: string | null;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
}

export async function getProfile(userId: string): Promise<PublicUser> {
  const result = await getDatabasePool().query<PublicUser>(
    `SELECT id, nom, postnom, email, role, status, created_at
     FROM users WHERE id = $1`,
    [userId]
  );

  if (!result.rows[0]) {
    throw new AppError(404, 'Utilisateur introuvable', 'USER_NOT_FOUND');
  }

  return result.rows[0];
}
