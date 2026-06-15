import { createHash, randomBytes } from 'node:crypto';
import type { PoolClient } from 'pg';
import { getDatabasePool } from '../../core/config/database.js';
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

export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

export async function issueTokenPair(
  client: PoolClient,
  user: { id: string; email: string; role: UserRole },
  metadata: SessionMetadata = {}
): Promise<{ accessToken: string; refreshToken: string }> {
  const refreshToken = createRefreshToken();

  await client.query(
    `INSERT INTO refresh_tokens(
       user_id, token_hash, expires_at, user_agent, ip_address
     )
     VALUES ($1, $2, $3, $4, $5)`,
    [
      user.id,
      hashToken(refreshToken),
      refreshExpiration(),
      metadata.userAgent ?? null,
      metadata.ipAddress ?? null
    ]
  );

  return {
    accessToken: signAccessToken(user),
    refreshToken
  };
}

export async function rotateRefreshToken(
  client: PoolClient,
  token: string,
  metadata: SessionMetadata = {}
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
    `UPDATE refresh_tokens
     SET revoked_at = NOW(), last_used_at = NOW()
     WHERE id = $1`,
    [stored.id]
  );

  return issueTokenPair(client, {
    id: stored.user_id,
    email: stored.email,
    role: stored.role
  }, metadata);
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

export async function listSessions(userId: string) {
  const result = await getDatabasePool().query(
    `SELECT id, user_agent, host(ip_address) AS ip_address,
            created_at, last_used_at, expires_at
     FROM refresh_tokens
     WHERE user_id = $1
       AND revoked_at IS NULL
       AND expires_at > NOW()
     ORDER BY last_used_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function revokeSession(
  userId: string,
  sessionId: string
): Promise<void> {
  const result = await getDatabasePool().query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
    [sessionId, userId]
  );

  if (!result.rowCount) {
    throw new AppError(404, 'Session introuvable', 'SESSION_NOT_FOUND');
  }
}
