import { getDatabasePool } from '../../core/config/database.js';
import { AppError } from '../../core/utils/appError.js';
import { paginationResult } from '../../core/utils/pagination.js';

export async function listUsers(input: {
  page: number;
  limit: number;
  status?: string;
  search?: string;
  role: 'USER' | 'ADMIN';
  sortBy: 'nom' | 'email' | 'status' | 'created_at';
  sortOrder: 'asc' | 'desc';
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const offset = (input.page - 1) * input.limit;
  const search = input.search ? `%${input.search}%` : null;
  const sortColumns = {
    nom: 'nom',
    email: 'email',
    status: 'status',
    created_at: 'created_at'
  } as const;
  const orderBy = sortColumns[input.sortBy];
  const direction = input.sortOrder === 'asc' ? 'ASC' : 'DESC';
  const result = await getDatabasePool().query(
    `SELECT id, nom, postnom, email, role, status, email_verified_at,
            avatar_url, created_at, updated_at,
            COUNT(*) OVER()::INTEGER AS total
     FROM users
     WHERE role = $3
       AND ($4::user_status IS NULL OR status = $4)
       AND (
         $5::TEXT IS NULL
         OR nom ILIKE $5
         OR postnom ILIKE $5
         OR email ILIKE $5
       )
       AND ($6::TIMESTAMPTZ IS NULL OR created_at >= $6)
       AND ($7::TIMESTAMPTZ IS NULL OR created_at <= $7)
     ORDER BY ${orderBy} ${direction}, id ASC
     LIMIT $1 OFFSET $2`,
    [
      input.limit,
      offset,
      input.role,
      input.status ?? null,
      search,
      input.dateFrom ?? null,
      input.dateTo ?? null
    ]
  );
  const total = result.rows[0]?.total ?? 0;

  return {
    items: result.rows.map(({ total: _total, ...user }) => user),
    pagination: paginationResult(input, total)
  };
}

export async function getUser(id: string) {
  const result = await getDatabasePool().query(
    `SELECT id, nom, postnom, email, role, status, avatar_url,
            email_verified_at, password_changed_at, created_at, updated_at
     FROM users
     WHERE id = $1`,
    [id]
  );

  if (!result.rows[0]) {
    throw new AppError(404, 'Utilisateur introuvable', 'USER_NOT_FOUND');
  }
  return result.rows[0];
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
