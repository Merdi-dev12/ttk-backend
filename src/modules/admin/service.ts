import { getDatabasePool } from '../../core/config/database.js';

interface DashboardFilters {
  dateFrom?: Date;
  dateTo?: Date;
  currency: 'USD' | 'CDF';
}

export async function getDashboardSummary(filters: DashboardFilters) {
  const pool = getDatabasePool();
  const result = await pool.query(
    `SELECT
       (SELECT COUNT(*)::INTEGER FROM services) AS services_total,
       (SELECT COUNT(*)::INTEGER FROM services
        WHERE status = 'ACTIVE') AS services_active,
       (SELECT COUNT(*)::INTEGER FROM services
        WHERE status = 'SUSPENDED') AS services_suspended,
       (SELECT COUNT(*)::INTEGER FROM products) AS products_total,
       (SELECT COUNT(*)::INTEGER FROM products
        WHERE status = 'ACTIVE') AS products_active,
       (SELECT COUNT(*)::INTEGER FROM products
        WHERE status = 'SUSPENDED') AS products_suspended,
       (SELECT COUNT(*)::INTEGER FROM products
        WHERE status = 'DELETED') AS products_deleted,
       (SELECT COUNT(*)::INTEGER FROM users
        WHERE role = 'USER') AS users_total,
       (SELECT COUNT(*)::INTEGER FROM users
        WHERE role = 'USER' AND status = 'ACTIVE') AS users_active,
       (SELECT COUNT(*)::INTEGER FROM users
        WHERE role = 'USER' AND status = 'REVOKED') AS users_revoked,
       (SELECT COUNT(*)::INTEGER FROM users
        WHERE role = 'USER'
          AND ($1::TIMESTAMPTZ IS NULL OR created_at >= $1)
          AND ($2::TIMESTAMPTZ IS NULL OR created_at <= $2)) AS users_new`,
    [filters.dateFrom ?? null, filters.dateTo ?? null]
  );
  const row = result.rows[0];
  const seriesResult = await pool.query(
    `WITH days AS (
       SELECT generate_series(
         COALESCE($1::DATE, CURRENT_DATE - INTERVAL '29 days'),
         COALESCE($2::DATE, CURRENT_DATE),
         INTERVAL '1 day'
       )::DATE AS date
     )
     SELECT TO_CHAR(d.date, 'YYYY-MM-DD') AS date,
            (SELECT COUNT(*)::INTEGER FROM users u
             WHERE u.role = 'USER' AND u.created_at::DATE = d.date) AS users,
            (SELECT COUNT(*)::INTEGER FROM services s
             WHERE s.created_at::DATE = d.date) AS services,
            (SELECT COUNT(*)::INTEGER FROM products p
             WHERE p.created_at::DATE = d.date) AS products,
            0::INTEGER AS orders,
            0::NUMERIC AS revenue
     FROM days d
     ORDER BY d.date`,
    [filters.dateFrom ?? null, filters.dateTo ?? null]
  );

  return {
    services: {
      total: row.services_total,
      active: row.services_active,
      suspended: row.services_suspended
    },
    products: {
      total: row.products_total,
      active: row.products_active,
      suspended: row.products_suspended,
      deleted: row.products_deleted
    },
    users: {
      total: row.users_total,
      active: row.users_active,
      revoked: row.users_revoked,
      new: row.users_new
    },
    orders: null,
    payments: null,
    submissions: null,
    series: seriesResult.rows,
    currency: filters.currency,
    unavailableDomains: [
      'orders',
      'payments',
      'invoices',
      'formSubmissions'
    ]
  };
}

export async function getDashboardActivity() {
  return {
    items: [],
    unavailableDomains: [
      'orders',
      'payments',
      'formSubmissions',
      'auditLogs'
    ]
  };
}
