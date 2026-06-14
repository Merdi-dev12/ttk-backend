import { getDatabasePool } from '../../core/config/database.js';
import { AppError } from '../../core/utils/appError.js';

export async function listUsers(input: {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}) {
  const offset = (input.page - 1) * input.limit;
  const search = input.search ? `%${input.search}%` : null;
  const result = await getDatabasePool().query(
    `SELECT id, nom, postnom, email, role, status, email_verified_at,
            created_at, updated_at, COUNT(*) OVER()::INTEGER AS total
     FROM users
     WHERE role = 'USER'
       AND ($3::user_status IS NULL OR status = $3)
       AND (
         $4::TEXT IS NULL
         OR nom ILIKE $4
         OR postnom ILIKE $4
         OR email ILIKE $4
       )
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [input.limit, offset, input.status ?? null, search]
  );
  const total = result.rows[0]?.total ?? 0;

  return {
    items: result.rows.map(({ total: _total, ...user }) => user),
    pagination: { page: input.page, limit: input.limit, total }
  };
}

export async function updateUserStatus(id: string, status: string) {
  const result = await getDatabasePool().query(
    `UPDATE users
     SET status = $2, updated_at = NOW()
     WHERE id = $1 AND role = 'USER'
     RETURNING id, nom, postnom, email, role, status, created_at, updated_at`,
    [id, status]
  );

  if (!result.rows[0]) {
    throw new AppError(404, 'Utilisateur introuvable', 'USER_NOT_FOUND');
  }

  if (status === 'REVOKED') {
    await getDatabasePool().query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [id]
    );
  }

  return result.rows[0];
}
