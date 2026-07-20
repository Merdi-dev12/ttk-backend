import type { Request, RequestHandler } from 'express';
import { enqueueTestEmail } from '../../core/queues/email.queue.js';
import {
  settingsSchemas,
  type SettingsSection
} from './settings.schema.js';
import * as settingsService from './settings.service.js';

function requestContext(request: Request) {
  return {
    adminId: request.auth!.userId,
    ipAddress: request.ip ?? request.socket.remoteAddress ?? '127.0.0.1',
    userAgent: request.get('user-agent')?.slice(0, 500)
  };
}

export const getSettings: RequestHandler = async (_request, response) => {
  const settings = await settingsService.getSettings();
  response.json({ status: 'success', data: { settings } });
};

export function updateSection(section: SettingsSection): RequestHandler {
  return async (request, response) => {
    const settings = await settingsService.updateSettings(
      section,
      request.validated?.body as Record<string, unknown>,
      requestContext(request)
    );
    response.json({ status: 'success', data: { settings } });
  };
}

export const testEmail: RequestHandler = async (request, response) => {
  const { email } = request.validated?.body as { email: string };
  const settings = await settingsService.getSettings();
  const general = settings.general as { platformName?: string };
  await enqueueTestEmail({
    type: 'ADMIN_TEST_EMAIL',
    to: email,
    platformName: general.platformName ?? 'TTK Services'
  });
  response.status(202).json({
    status: 'success',
    message: 'Email de test ajoute a la file d envoi.'
  });
};

export const clearCache: RequestHandler = async (_request, response) => {
  await settingsService.clearSettingsCache();
  response.json({
    status: 'success',
    message: 'Cache des parametres vide.'
  });
};

export { settingsSchemas };
