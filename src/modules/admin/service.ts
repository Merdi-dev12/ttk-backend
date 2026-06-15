import { getDatabasePool } from '../../core/config/database.js';

interface DashboardFilters {
  dateFrom?: Date;
  dateTo?: Date;
  currency: 'USD' | 'CDF';
}

export async function getDashboardSummary(filters: DashboardFilters) {
  const result = await getDatabasePool().query(
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
    series: [],
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
