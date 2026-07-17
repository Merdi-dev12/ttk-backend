import bcrypt from 'bcrypt';
import { getDatabasePool } from '../../core/config/database.js';
import { config } from '../../core/config/env.js';
import { logger } from '../../core/utils/logger.js';

async function createAdmin(): Promise<void> {
  const { name, email, password } = config.adminBootstrap;

  if (!name || !email || !password) {
    throw new Error(
      'ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD are required'
    );
  }

  const passwordHash = await bcrypt.hash(
    password,
    config.auth.bcryptRounds
  );

  const pool = getDatabasePool();

  try {
    const existing = await pool.query<{ id: string; email: string }>(
      `SELECT id, email FROM users
       WHERE role = 'ADMIN'`
    );
    const admin = existing.rows[0];

    if (admin) {
      await pool.query(
        `UPDATE users
         SET nom = $2,
             email = $3,
             password_hash = $4,
             status = 'ACTIVE',
             password_changed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [admin.id, name, email, passwordHash]
      );
      await pool.query(
        `UPDATE refresh_tokens SET revoked_at = NOW()
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [admin.id]
      );
      logger.info('admin_credentials_updated', { adminId: admin.id });
      return;
    }

    const result = await pool.query<{ id: string }>(
      `INSERT INTO users(nom, email, password_hash, role)
       VALUES ($1, $2, $3, 'ADMIN')
      RETURNING id`,
      [name, email, passwordHash]
    );
    logger.info('admin_created', { adminId: result.rows[0]!.id });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    ) {
      throw new Error('An admin or a user with this email already exists');
    }
    throw error;
  } finally {
    await pool.end();
  }
}

createAdmin().catch((error) => {
  logger.error('admin_creation_failed', { error });
  process.exit(1);
});
