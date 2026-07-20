import ipaddr from 'ipaddr.js';
import { getDatabasePool } from '../../core/config/database.js';
import { getRedisClient } from '../../core/config/redis.js';
import { AppError } from '../../core/utils/appError.js';
import {
  settingsSchemas,
  type SettingsSection
} from './settings.schema.js';

const cacheKey = 'admin:settings';

function normalizeIp(ip: string): string {
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

function ipMatchesRule(ip: string, rule: string): boolean {
  const address = ipaddr.process(ip);
  if (!rule.includes('/')) {
    return address.toString() === ipaddr.process(rule).toString();
  }
  const [network, prefix] = ipaddr.parseCIDR(rule);
  const processedNetwork = ipaddr.process(network.toString());
  return address.kind() === processedNetwork.kind() &&
    address.match(processedNetwork, prefix);
}

export async function getSettings() {
  const redis = getRedisClient();
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as Record<string, unknown>;
  }

  const result = await getDatabasePool().query<{
    section: string;
    value: Record<string, unknown>;
  }>('SELECT section, value FROM admin_settings ORDER BY section');
  const settings = Object.fromEntries(
    result.rows.map((row) => [row.section, row.value])
  );
  await redis.set(cacheKey, JSON.stringify(settings), 'EX', 300);
  return settings;
}

export async function updateSettings(
  section: SettingsSection,
  patch: Record<string, unknown>,
  context: {
    adminId: string;
    ipAddress: string;
    userAgent?: string;
  }
) {
  const client = await getDatabasePool().connect();
  await client.query('BEGIN');
  try {
    const current = await client.query<{ value: Record<string, unknown> }>(
      'SELECT value FROM admin_settings WHERE section = $1 FOR UPDATE',
      [section]
    );
    const previous = current.rows[0]?.value ?? null;
    const candidate = {
      ...(previous ?? {}),
      ...patch
    };
    const { value, error } = settingsSchemas[section].validate(candidate, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      throw new AppError(400, error.message, 'VALIDATION_ERROR');
    }

    if (section === 'security') {
      const allowed = value.allowedAdminIps as string[];
      const currentIp = normalizeIp(context.ipAddress);
      if (allowed.length > 0 && !allowed.some((rule) => ipMatchesRule(currentIp, rule))) {
        throw new AppError(
          409,
          "La restriction IP doit autoriser l'adresse actuelle de l'administrateur",
          'CURRENT_ADMIN_IP_BLOCKED'
        );
      }
    }

    await client.query(
      `INSERT INTO admin_settings(section, value, updated_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (section) DO UPDATE SET
         value = EXCLUDED.value,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()`,
      [section, JSON.stringify(value), context.adminId]
    );
    await client.query(
      `INSERT INTO audit_logs(
         admin_id, action, resource_type, resource_id,
         previous_values, new_values, ip_address, user_agent
       )
       VALUES ($1, 'UPDATE_SETTINGS', 'ADMIN_SETTINGS', $2,
               $3, $4, $5, $6)`,
      [
        context.adminId,
        section,
        previous ? JSON.stringify(previous) : null,
        JSON.stringify(value),
        normalizeIp(context.ipAddress),
        context.userAgent ?? null
      ]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  await clearSettingsCache();
  return getSettings();
}

export async function clearSettingsCache(): Promise<void> {
  await getRedisClient().del(cacheKey);
}
