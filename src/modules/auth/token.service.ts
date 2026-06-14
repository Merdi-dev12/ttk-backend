import { createHash, randomBytes } from 'node:crypto';
import type { PoolClient } from 'pg';
import { config } from '../../core/config/env.js';
import type { UserRole } from '../../core/types/auth.js';
import { AppError } from '../../core/utils/appError.js';
import { signAccessToken } from '../../core/utils/jwt.js';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function createRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

function refreshExpiration(): Date {
  const expiration = new Date();
  expiration.setUTCDate(
    expiration.getUTCDate() + config.auth.refreshTtlDays
  );
  return expiration;
}

export async function issueTokenPair(
  client: PoolClient,
  user: { id: string; email: string; role: UserRole }
): Promise<{ accessToken: string; refreshToken: string }> {
  const refreshToken = createRefreshToken();

  await client.query(
    `INSERT INTO refresh_tokens(user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, hashToken(refreshToken), refreshExpiration()]
  );

  return {
    accessToken: signAccessToken(user),
    refreshToken
  };
}

export async function rotateRefreshToken(
  client: PoolClient,
  token: string
): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const result = await client.query<{
    id: string;
    user_id: string;
    email: string;
    role: UserRole;
    status: string;
  }>(
    `SELECT rt.id, rt.user_id, u.email, u.role, u.status
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1
       AND rt.revoked_at IS NULL
       AND rt.expires_at > NOW()
     FOR UPDATE`,
    [hashToken(token)]
  );
  const stored = result.rows[0];

  if (!stored || stored.status !== 'ACTIVE') {
    throw new AppError(
      401,
      'Refresh token invalide ou expiré',
      'INVALID_REFRESH_TOKEN'
    );
  }

  await client.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
    [stored.id]
  );

  return issueTokenPair(client, {
    id: stored.user_id,
    email: stored.email,
    role: stored.role
  });
}

export async function revokeRefreshToken(
  client: PoolClient,
  token: string
): Promise<void> {
  await client.query(
    `UPDATE refresh_tokens
     SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE token_hash = $1`,
    [hashToken(token)]
  );
}
