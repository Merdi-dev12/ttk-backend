import { OAuth2Client } from 'google-auth-library';
import type { PoolClient } from 'pg';
import { getDatabasePool } from '../../core/config/database.js';
import { config } from '../../core/config/env.js';
import { AppError } from '../../core/utils/appError.js';
import type { PublicUser } from './profile.service.js';
import {
  issueTokenPair,
  type SessionMetadata
} from './token.service.js';

let googleClient: OAuth2Client | undefined;

function getGoogleClient(): OAuth2Client {
  if (!config.google.clientId) {
    throw new AppError(
      503,
      'La connexion Google n’est pas configurée',
      'GOOGLE_AUTH_NOT_CONFIGURED'
    );
  }
  googleClient ??= new OAuth2Client(config.google.clientId);
  return googleClient;
}

export async function warmGoogleAuth(): Promise<void> {
  if (!config.google.clientId) {
    return;
  }
  await getGoogleClient().getFederatedSignonCertsAsync();
}

async function verifiedGoogleProfile(credential: string) {
  try {
    const ticket = await getGoogleClient().verifyIdToken({
      idToken: credential,
      audience: config.google.clientId
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified) {
      throw new Error('Incomplete or unverified Google profile');
    }
    return {
      sub: payload.sub,
      email: payload.email.toLowerCase(),
      nom: payload.given_name || payload.name || payload.email.split('@')[0]!,
      postnom: payload.family_name || null,
      avatarUrl: payload.picture || null
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      401,
      'Jeton Google invalide ou expiré',
      'INVALID_GOOGLE_TOKEN'
    );
  }
}

async function findOrCreateUser(
  client: PoolClient,
  profile: Awaited<ReturnType<typeof verifiedGoogleProfile>>
): Promise<PublicUser> {
  const result = await client.query<PublicUser & { google_sub: string | null }>(
    `SELECT id, nom, postnom, email, role, status, avatar_url,
            created_at, google_sub
     FROM users
     WHERE google_sub = $1 OR email = $2
     FOR UPDATE`,
    [profile.sub, profile.email]
  );
  const bySubject = result.rows.find((user) => user.google_sub === profile.sub);
  const byEmail = result.rows.find(
    (user) => user.email.toLowerCase() === profile.email
  );

  if (bySubject && byEmail && bySubject.id !== byEmail.id) {
    throw new AppError(
      409,
      'Le compte Google entre en conflit avec un compte existant',
      'GOOGLE_ACCOUNT_CONFLICT'
    );
  }

  const existing = bySubject ?? byEmail;
  if (existing) {
    if (existing.google_sub && existing.google_sub !== profile.sub) {
      throw new AppError(
        409,
        'Cet email est déjà associé à un autre compte Google',
        'GOOGLE_ACCOUNT_CONFLICT'
      );
    }
    if (existing.status === 'REVOKED') {
      throw new AppError(403, 'Ce compte a été révoqué', 'ACCOUNT_REVOKED');
    }
    const updated = await client.query<PublicUser>(
      `UPDATE users SET
         google_sub = $2,
         avatar_url = COALESCE(avatar_url, $3),
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, nom, postnom, email, role, status,
                 avatar_url, created_at`,
      [existing.id, profile.sub, profile.avatarUrl]
    );
    return updated.rows[0]!;
  }

  const created = await client.query<PublicUser>(
    `INSERT INTO users(
       nom, postnom, email, password_hash, google_sub, avatar_url
     )
     VALUES ($1, $2, $3, NULL, $4, $5)
     RETURNING id, nom, postnom, email, role, status,
               avatar_url, created_at`,
    [
      profile.nom,
      profile.postnom,
      profile.email,
      profile.sub,
      profile.avatarUrl
    ]
  );
  return created.rows[0]!;
}

export async function loginWithGoogle(
  credential: string,
  metadata: SessionMetadata
) {
  const profile = await verifiedGoogleProfile(credential);
  const client = await getDatabasePool().connect();
  await client.query('BEGIN');
  try {
    const user = await findOrCreateUser(client, profile);
    const tokens = await issueTokenPair(client, user, metadata);
    await client.query('COMMIT');
    return { user, ...tokens };
  } catch (error) {
    await client.query('ROLLBACK');
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    ) {
      throw new AppError(
        409,
        'Le compte Google entre en conflit avec un compte existant',
        'GOOGLE_ACCOUNT_CONFLICT'
      );
    }
    throw error;
  } finally {
    client.release();
  }
}
