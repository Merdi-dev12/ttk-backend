import { getDatabasePool } from '../../core/config/database.js';
import { paginationResult } from '../../core/utils/pagination.js';

export type AdminNotificationType = 'CONTACT_MESSAGE' | 'INBOUND_EMAIL';

export interface CreateAdminNotificationInput {
  type: AdminNotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface AdminNotificationsQuery {
  page: number;
  limit: number;
  unreadOnly?: boolean;
}

export async function createAdminNotification(
  input: CreateAdminNotificationInput
): Promise<void> {
  await getDatabasePool().query(
    `INSERT INTO admin_notifications(type, title, message, metadata)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [
      input.type,
      input.title,
      input.message,
      JSON.stringify(input.metadata ?? {})
    ]
  );
}

export async function listAdminNotifications(query: AdminNotificationsQuery) {
  const offset = (query.page - 1) * query.limit;
  const pool = getDatabasePool();
  const unreadOnly = query.unreadOnly === true;

  const totalResult = await pool.query(
    `SELECT COUNT(*)::INTEGER AS total
     FROM admin_notifications
     WHERE ($1::BOOLEAN = FALSE OR read_at IS NULL)`,
    [unreadOnly]
  );

  const result = await pool.query(
    `SELECT id, type, title, message, metadata,
            read_at AS "readAt",
            created_at AS "createdAt"
     FROM admin_notifications
     WHERE ($1::BOOLEAN = FALSE OR read_at IS NULL)
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [unreadOnly, query.limit, offset]
  );

  return {
    items: result.rows,
    pagination: paginationResult(query, totalResult.rows[0]!.total)
  };
}

export async function getUnreadNotificationsCount(): Promise<{ unread: number }> {
  const result = await getDatabasePool().query(
    `SELECT COUNT(*)::INTEGER AS unread
     FROM admin_notifications
     WHERE read_at IS NULL`
  );

  return { unread: result.rows[0]!.unread };
}

export async function markNotificationAsRead(id: string) {
  const result = await getDatabasePool().query(
    `UPDATE admin_notifications
     SET read_at = COALESCE(read_at, NOW())
     WHERE id = $1
     RETURNING id, type, title, message, metadata,
               read_at AS "readAt",
               created_at AS "createdAt"`,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function markAllNotificationsAsRead(): Promise<{ updated: number }> {
  const result = await getDatabasePool().query(
    `UPDATE admin_notifications
     SET read_at = NOW()
     WHERE read_at IS NULL`
  );

  return { updated: result.rowCount ?? 0 };
}
