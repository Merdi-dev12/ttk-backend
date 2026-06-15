import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcrypt';
import type { PoolClient } from 'pg';
import { getDatabasePool } from '../../core/config/database.js';
import { config } from '../../core/config/env.js';
import { enqueueOtpEmail } from '../../core/queues/email.queue.js';
import type { UserRole } from '../../core/types/auth.js';
import { AppError } from '../../core/utils/appError.js';
import type {
  LoginInput,
  RegisterInput,
  VerifyOtpInput
} from './schema.js';
import type { PublicUser } from './profile.service.js';
import {
  issueTokenPair,
  type SessionMetadata,
  revokeRefreshToken,
  rotateRefreshToken
} from './token.service.js';

function getOtpSecret(): string {
  if (!config.auth.jwtSecret) {
    throw new Error('JWT_SECRET is required to generate OTP hashes');
  }

  return config.auth.jwtSecret;
}

function createOtp(): string {
  return randomInt(100_000, 1_000_000).toString();
}

function hashOtp(email: string, otp: string): string {
  return createHmac('sha256', getOtpSecret())
    .update(`${email}:${otp}`)
    .digest('hex');
}

function otpMatches(email: string, otp: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashOtp(email, otp), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function otpExpiration(): Date {
  return new Date(Date.now() + config.auth.otpTtlMinutes * 60_000);
}

async function withTransaction<T>(
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getDatabasePool().connect();
  await client.query('BEGIN');

  try {
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    if (error instanceof AppError && error.code === 'INVALID_OTP') {
      await client.query('COMMIT');
    } else {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function register(input: RegisterInput): Promise<void> {
  const pool = getDatabasePool();
  const existing = await pool.query(
    'SELECT 1 FROM users WHERE email = $1',
    [input.email]
  );

  if (existing.rowCount) {
    throw new AppError(409, 'Un compte utilise déjà cet email', 'EMAIL_USED');
  }

  const otp = createOtp();
  const passwordHash = await bcrypt.hash(
    input.password,
    config.auth.bcryptRounds
  );

  await pool.query(
    `INSERT INTO pending_registrations(
       nom, postnom, email, password_hash, otp_hash, otp_expires_at
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (email) DO UPDATE SET
       nom = EXCLUDED.nom,
       postnom = EXCLUDED.postnom,
       password_hash = EXCLUDED.password_hash,
       otp_hash = EXCLUDED.otp_hash,
       otp_expires_at = EXCLUDED.otp_expires_at,
       otp_attempts = 0,
       updated_at = NOW()`,
    [
      input.nom,
      input.postnom || null,
      input.email,
      passwordHash,
      hashOtp(input.email, otp),
      otpExpiration()
    ]
  );

  await enqueueOtpEmail({
    type: 'REGISTRATION_OTP',
    to: input.email,
    name: input.nom,
    otp,
    expiresInMinutes: config.auth.otpTtlMinutes
  });
}

export async function resendRegistrationOtp(email: string): Promise<void> {
  const pool = getDatabasePool();
  const pending = await pool.query<{ nom: string }>(
    'SELECT nom FROM pending_registrations WHERE email = $1',
    [email]
  );

  if (!pending.rows[0]) {
    throw new AppError(
      404,
      'Aucune inscription en attente',
      'PENDING_REGISTRATION_NOT_FOUND'
    );
  }

  const otp = createOtp();
  await pool.query(
    `UPDATE pending_registrations
     SET otp_hash = $2, otp_expires_at = $3, otp_attempts = 0, updated_at = NOW()
     WHERE email = $1`,
    [email, hashOtp(email, otp), otpExpiration()]
  );

  await enqueueOtpEmail({
    type: 'REGISTRATION_OTP',
    to: email,
    name: pending.rows[0].nom,
    otp,
    expiresInMinutes: config.auth.otpTtlMinutes
  });
}

export async function verifyRegistration(
  input: VerifyOtpInput
): Promise<PublicUser> {
  return withTransaction(async (client) => {
    const result = await client.query<{
      id: string;
      nom: string;
      postnom: string | null;
      email: string;
      password_hash: string;
      otp_hash: string;
      otp_expires_at: Date;
      otp_attempts: number;
    }>(
      `SELECT * FROM pending_registrations
       WHERE email = $1
       FOR UPDATE`,
      [input.email]
    );
    const pending = result.rows[0];

    if (!pending) {
      throw new AppError(
        404,
        'Aucune inscription en attente',
        'PENDING_REGISTRATION_NOT_FOUND'
      );
    }

    if (pending.otp_expires_at.getTime() <= Date.now()) {
      throw new AppError(410, 'OTP expiré', 'OTP_EXPIRED');
    }

    if (pending.otp_attempts >= config.auth.otpMaxAttempts) {
      throw new AppError(429, 'Nombre maximal de tentatives atteint', 'OTP_LOCKED');
    }

    if (!otpMatches(input.email, input.otp, pending.otp_hash)) {
      await client.query(
        `UPDATE pending_registrations
         SET otp_attempts = otp_attempts + 1, updated_at = NOW()
         WHERE id = $1`,
        [pending.id]
      );
      throw new AppError(400, 'OTP invalide', 'INVALID_OTP');
    }

    const user = await client.query<PublicUser>(
      `INSERT INTO users(nom, postnom, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nom, postnom, email, role, status, avatar_url, created_at`,
      [pending.nom, pending.postnom, pending.email, pending.password_hash]
    );
    await client.query(
      'DELETE FROM pending_registrations WHERE id = $1',
      [pending.id]
    );

    return user.rows[0]!;
  });
}

export async function login(
  input: LoginInput,
  metadata: SessionMetadata
): Promise<{
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}> {
  const pool = getDatabasePool();
  const result = await pool.query<PublicUser & { password_hash: string }>(
    `SELECT id, nom, postnom, email, role, status, avatar_url,
            created_at, password_hash
     FROM users
     WHERE email = $1`,
    [input.email]
  );
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(input.password, user.password_hash))) {
    throw new AppError(
      401,
      'Email ou mot de passe incorrect',
      'INVALID_CREDENTIALS'
    );
  }

  if (user.status === 'REVOKED') {
    throw new AppError(403, 'Ce compte a été révoqué', 'ACCOUNT_REVOKED');
  }

  const tokens = await withTransaction((client) =>
    issueTokenPair(client, user, metadata)
  );
  const { password_hash: _passwordHash, ...publicUser } = user;

  return { user: publicUser, ...tokens };
}

export async function refresh(token: string, metadata: SessionMetadata) {
  return withTransaction((client) =>
    rotateRefreshToken(client, token, metadata)
  );
}

export async function logout(token: string): Promise<void> {
  await withTransaction((client) => revokeRefreshToken(client, token));
}

export async function forgotPassword(email: string): Promise<void> {
  const pool = getDatabasePool();
  const result = await pool.query<{ id: string; nom: string }>(
    `SELECT id, nom FROM users
     WHERE email = $1 AND status = 'ACTIVE'`,
    [email]
  );
  const user = result.rows[0];

  if (!user) {
    return;
  }

  const otp = createOtp();
  await pool.query(
    `INSERT INTO password_reset_otps(
       user_id, otp_hash, otp_expires_at
     )
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET
       otp_hash = EXCLUDED.otp_hash,
       otp_expires_at = EXCLUDED.otp_expires_at,
       otp_attempts = 0,
       updated_at = NOW()`,
    [user.id, hashOtp(email, otp), otpExpiration()]
  );

  await enqueueOtpEmail({
    type: 'PASSWORD_RESET_OTP',
    to: email,
    name: user.nom,
    otp,
    expiresInMinutes: config.auth.otpTtlMinutes
  });
}

export async function resetPassword(input: {
  email: string;
  otp: string;
  newPassword: string;
}): Promise<void> {
  await withTransaction(async (client) => {
    const result = await client.query<{
      user_id: string;
      otp_hash: string;
      otp_expires_at: Date;
      otp_attempts: number;
    }>(
      `SELECT pro.*
       FROM password_reset_otps pro
       JOIN users u ON u.id = pro.user_id
       WHERE u.email = $1
       FOR UPDATE`,
      [input.email]
    );
    const reset = result.rows[0];

    if (!reset || reset.otp_expires_at.getTime() <= Date.now()) {
      throw new AppError(400, 'OTP invalide ou expiré', 'INVALID_OTP');
    }

    if (reset.otp_attempts >= config.auth.otpMaxAttempts) {
      throw new AppError(429, 'Nombre maximal de tentatives atteint', 'OTP_LOCKED');
    }

    if (!otpMatches(input.email, input.otp, reset.otp_hash)) {
      await client.query(
        `UPDATE password_reset_otps
         SET otp_attempts = otp_attempts + 1, updated_at = NOW()
         WHERE user_id = $1`,
        [reset.user_id]
      );
      throw new AppError(400, 'OTP invalide', 'INVALID_OTP');
    }

    const passwordHash = await bcrypt.hash(
      input.newPassword,
      config.auth.bcryptRounds
    );
    await client.query(
      `UPDATE users
       SET password_hash = $2, password_changed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [reset.user_id, passwordHash]
    );
    await client.query(
      'DELETE FROM password_reset_otps WHERE user_id = $1',
      [reset.user_id]
    );
    await client.query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [reset.user_id]
    );
  });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await withTransaction(async (client) => {
    const result = await client.query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      throw new AppError(400, 'Mot de passe actuel incorrect', 'INVALID_PASSWORD');
    }

    const passwordHash = await bcrypt.hash(
      newPassword,
      config.auth.bcryptRounds
    );
    await client.query(
      `UPDATE users
       SET password_hash = $2, password_changed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [userId, passwordHash]
    );
    await client.query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
  });
}
