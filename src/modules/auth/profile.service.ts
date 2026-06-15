import { getDatabasePool } from '../../core/config/database.js';
import type { UserRole, UserStatus } from '../../core/types/auth.js';
import { AppError } from '../../core/utils/appError.js';
import type { UpdateProfileInput } from './schema.js';

export interface PublicUser {
  id: string;
  nom: string;
  postnom: string | null;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar_url: string | null;
  created_at: Date;
}

export async function getProfile(userId: string): Promise<PublicUser> {
  const result = await getDatabasePool().query<PublicUser>(
    `SELECT id, nom, postnom, email, role, status, avatar_url, created_at
     FROM users WHERE id = $1`,
    [userId]
  );

  if (!result.rows[0]) {
    throw new AppError(404, 'Utilisateur introuvable', 'USER_NOT_FOUND');
  }

  return result.rows[0];
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<PublicUser> {
  const result = await getDatabasePool().query<PublicUser>(
    `UPDATE users SET
       nom = COALESCE($2, nom),
       postnom = CASE WHEN $3::BOOLEAN THEN $4 ELSE postnom END,
       avatar_url = CASE WHEN $5::BOOLEAN THEN $6 ELSE avatar_url END,
       updated_at = NOW()
     WHERE id = $1
     RETURNING id, nom, postnom, email, role, status, avatar_url, created_at`,
    [
      userId,
      input.nom ?? null,
      Object.hasOwn(input, 'postnom'),
      input.postnom || null,
      Object.hasOwn(input, 'avatarUrl'),
      input.avatarUrl || null
    ]
  );

  if (!result.rows[0]) {
    throw new AppError(404, 'Utilisateur introuvable', 'USER_NOT_FOUND');
  }

  return result.rows[0];
}
