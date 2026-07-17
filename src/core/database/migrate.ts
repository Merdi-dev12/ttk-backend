import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { getDatabasePool } from '../config/database.js';
import { logger } from '../utils/logger.js';

const migrationsDirectory = path.join(
  process.cwd(),
  'database',
  'migrations'
);

async function migrate(): Promise<void> {
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = (await readdir(migrationsDirectory))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const applied = await client.query<{ exists: boolean }>(
        'SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE name = $1) AS exists',
        [file]
      );

      if (applied.rows[0]?.exists) {
        continue;
      }

      const sql = await readFile(path.join(migrationsDirectory, file), 'utf8');
      await client.query('BEGIN');

      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations(name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        logger.info('migration_applied', { file });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  logger.error('migration_failed', { error });
  process.exit(1);
});
