import type { PoolClient } from 'pg';
import { getDatabasePool } from '../../core/config/database.js';
import { config } from '../../core/config/env.js';
import { AppError } from '../../core/utils/appError.js';
import type { PublicUser } from './profile.service.js';
import {
  issueTokenPair,
  type SessionMetadata
} from './token.service.js';

interface SupabaseUserResponse {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: {
    avatar_url?: string;
    full_name?: string;
    name?: string;
    picture?: string;
    given_name?: string;
    family_name?: string;
  };
}

interface VerifiedSupabaseProfile {
  id: string;
  email: string;
  nom: string;
  postnom: string | null;
  avatarUrl: string | null;
}

function supabaseConfiguration(): { url: string; anonKey: string } {
  if (!config.supabase.url || !config.supabase.anonKey) {
    throw new AppError(
      503,
      'La connexion Supabase n est pas configuree',
      'SUPABASE_AUTH_NOT_CONFIGURED'
    );
  }

  return {
    url: config.supabase.url.replace(/\/+$/, ''),
    anonKey: config.supabase.anonKey
  };
}

function splitName(metadata: SupabaseUserResponse['user_metadata'], email: string) {
  const fullName = metadata?.full_name ?? metadata?.name;
  if (fullName) {
    const [firstName, ...rest] = fullName.trim().split(/\s+/);
    return {
      nom: firstName || email.split('@')[0]!,
      postnom: rest.length > 0 ? rest.join(' ') : null
    };
  }

  return {
    nom: metadata?.given_name || email.split('@')[0]!,
    postnom: metadata?.family_name || null
  };
}

async function verifiedSupabaseProfile(accessToken: string): Promise<VerifiedSupabaseProfile> {
  const { url, anonKey } = supabaseConfiguration();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new AppError(
      401,
      'Jeton Supabase invalide ou expire',
      'INVALID_SUPABASE_TOKEN'
    );
  }

  const user = (await response.json()) as SupabaseUserResponse;
  if (!user.id || !user.email) {
    throw new AppError(
      401,
      'Profil Supabase incomplet',
      'INVALID_SUPABASE_TOKEN'
    );
  }

  const email = user.email.toLowerCase();
  const name = splitName(user.user_metadata, email);

  return {
    id: user.id,
    email,
    nom: name.nom,
    postnom: name.postnom,
    avatarUrl: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null
  };
}

async function findOrCreateUser(
  client: PoolClient,
  profile: VerifiedSupabaseProfile
): Promise<PublicUser> {
  const result = await client.query<PublicUser & { supabase_user_id: string | null }>(
    `SELECT id, nom, postnom, email, role, status, avatar_url,
            created_at, supabase_user_id
     FROM users
     WHERE supabase_user_id = $1 OR email = $2
     FOR UPDATE`,
    [profile.id, profile.email]
  );
  const bySupabaseId = result.rows.find(
    (user) => user.supabase_user_id === profile.id
  );
  const byEmail = result.rows.find(
    (user) => user.email.toLowerCase() === profile.email
  );

  if (bySupabaseId && byEmail && bySupabaseId.id !== byEmail.id) {
    throw new AppError(
      409,
      'Le compte Supabase entre en conflit avec un compte existant',
      'SUPABASE_ACCOUNT_CONFLICT'
    );
  }

  const existing = bySupabaseId ?? byEmail;
  if (existing) {
    if (existing.supabase_user_id && existing.supabase_user_id !== profile.id) {
      throw new AppError(
        409,
        'Cet email est deja associe a un autre compte Supabase',
        'SUPABASE_ACCOUNT_CONFLICT'
      );
    }
    if (existing.status === 'REVOKED') {
      throw new AppError(403, 'Ce compte a ete revoque', 'ACCOUNT_REVOKED');
    }

    const updated = await client.query<PublicUser>(
      `UPDATE users SET
         supabase_user_id = $2,
         avatar_url = COALESCE(avatar_url, $3),
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, nom, postnom, email, role, status,
                 avatar_url, created_at`,
      [existing.id, profile.id, profile.avatarUrl]
    );
    return updated.rows[0]!;
  }

  const created = await client.query<PublicUser>(
    `INSERT INTO users(
       nom, postnom, email, password_hash, supabase_user_id, avatar_url
     )
     VALUES ($1, $2, $3, NULL, $4, $5)
     RETURNING id, nom, postnom, email, role, status,
               avatar_url, created_at`,
    [
      profile.nom,
      profile.postnom,
      profile.email,
      profile.id,
      profile.avatarUrl
    ]
  );

  return created.rows[0]!;
}

export async function loginWithSupabase(
  accessToken: string,
  metadata: SessionMetadata
) {
  const profile = await verifiedSupabaseProfile(accessToken);
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
        'Le compte Supabase entre en conflit avec un compte existant',
        'SUPABASE_ACCOUNT_CONFLICT'
      );
    }
    throw error;
  } finally {
    client.release();
  }
}
