import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

let pool: pg.Pool | undefined;

export function getDatabasePool(): pg.Pool {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required to use PostgreSQL');
  }

  if (!/^postgres(?:ql)?:\/\//.test(config.databaseUrl)) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
  }

  pool ??= new Pool({
    connectionString: config.databaseUrl
  });

  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
