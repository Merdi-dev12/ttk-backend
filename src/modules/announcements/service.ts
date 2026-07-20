import { getDatabasePool } from '../../core/config/database.js';
import { AppError } from '../../core/utils/appError.js';
import { paginationResult } from '../../core/utils/pagination.js';

interface PaginationQuery {
  page: number;
  limit: number;
}

interface AdminAnnouncementsQuery extends PaginationQuery {
  search?: string;
  sortBy: 'name' | 'status' | 'created_at' | 'updated_at';
  sortOrder: 'asc' | 'desc';
  status?: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  dateFrom?: Date;
  dateTo?: Date;
}

interface AnnouncementInput {
  name: string;
  description?: string | null;
  imageUrl: string;
  status?: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
}

const sortableColumns = {
  name: 'name',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at'
} as const;

const announcementSelection = `
  id, name, description, image_url AS "imageUrl", status,
  created_by AS "createdBy",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export async function listPublicAnnouncements(query: PaginationQuery) {
  const offset = (query.page - 1) * query.limit;
  const pool = getDatabasePool();
  const totalResult = await pool.query(
    `SELECT COUNT(*)::INTEGER AS total
     FROM announcements
     WHERE status = 'ACTIVE'`
  );
  const result = await pool.query(
    `SELECT ${announcementSelection}
     FROM announcements
     WHERE status = 'ACTIVE'
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [query.limit, offset]
  );

  return {
    items: result.rows,
    pagination: paginationResult(query, totalResult.rows[0]!.total)
  };
}

export async function listAdminAnnouncements(query: AdminAnnouncementsQuery) {
  const offset = (query.page - 1) * query.limit;
  const sortColumn = sortableColumns[query.sortBy];
  const sortOrder = query.sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const search = query.search ? `%${query.search}%` : null;
  const pool = getDatabasePool();

  const params = [
    query.status ?? null,
    search,
    query.dateFrom ?? null,
    query.dateTo ?? null
  ];

  const where = `
    WHERE ($1::catalog_status IS NULL OR status = $1)
      AND ($2::TEXT IS NULL OR name ILIKE $2 OR description ILIKE $2)
      AND ($3::TIMESTAMPTZ IS NULL OR created_at >= $3)
      AND ($4::TIMESTAMPTZ IS NULL OR created_at <= $4)
  `;

  const totalResult = await pool.query(
    `SELECT COUNT(*)::INTEGER AS total
     FROM announcements
     ${where}`,
    params
  );
  const result = await pool.query(
    `SELECT ${announcementSelection}
     FROM announcements
     ${where}
     ORDER BY ${sortColumn} ${sortOrder}
     LIMIT $5 OFFSET $6`,
    [...params, query.limit, offset]
  );

  return {
    items: result.rows,
    pagination: paginationResult(query, totalResult.rows[0]!.total)
  };
}

export async function getAdminAnnouncement(id: string) {
  const result = await getDatabasePool().query(
    `SELECT ${announcementSelection}
     FROM announcements
     WHERE id = $1`,
    [id]
  );
  const announcement = result.rows[0];
  if (!announcement) {
    throw new AppError(404, 'Annonce introuvable', 'ANNOUNCEMENT_NOT_FOUND');
  }
  return announcement;
}

export async function createAnnouncement(
  input: AnnouncementInput,
  adminId: string
) {
  const result = await getDatabasePool().query(
    `INSERT INTO announcements(name, description, image_url, status, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${announcementSelection}`,
    [
      input.name,
      input.description || null,
      input.imageUrl,
      input.status ?? 'ACTIVE',
      adminId
    ]
  );

  return result.rows[0];
}

export async function updateAnnouncement(
  id: string,
  input: Partial<AnnouncementInput>
) {
  const result = await getDatabasePool().query(
    `UPDATE announcements
     SET name = COALESCE($2, name),
         description = CASE WHEN $3::BOOLEAN THEN $4 ELSE description END,
         image_url = COALESCE($5, image_url),
         status = COALESCE($6, status),
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${announcementSelection}`,
    [
      id,
      input.name ?? null,
      Object.hasOwn(input, 'description'),
      input.description || null,
      input.imageUrl ?? null,
      input.status ?? null
    ]
  );

  const announcement = result.rows[0];
  if (!announcement) {
    throw new AppError(404, 'Annonce introuvable', 'ANNOUNCEMENT_NOT_FOUND');
  }
  return announcement;
}

export async function updateAnnouncementStatus(
  id: string,
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED'
) {
  return updateAnnouncement(id, { status });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const result = await getDatabasePool().query(
    `DELETE FROM announcements
     WHERE id = $1`,
    [id]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, 'Annonce introuvable', 'ANNOUNCEMENT_NOT_FOUND');
  }
}
