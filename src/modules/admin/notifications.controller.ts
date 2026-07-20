import type { RequestHandler } from 'express';
import { AppError } from '../../core/utils/appError.js';
import * as notificationService from './notifications.service.js';

export const list: RequestHandler = async (request, response) => {
  const data = await notificationService.listAdminNotifications(
    request.validated?.query as notificationService.AdminNotificationsQuery
  );
  response.json({ status: 'success', data });
};

export const unreadCount: RequestHandler = async (_request, response) => {
  const data = await notificationService.getUnreadNotificationsCount();
  response.json({ status: 'success', data });
};

export const markRead: RequestHandler = async (request, response) => {
  const notification = await notificationService.markNotificationAsRead(
    (request.validated?.params as { id: string }).id
  );

  if (!notification) {
    throw new AppError(404, 'Notification introuvable', 'NOTIFICATION_NOT_FOUND');
  }

  response.json({ status: 'success', data: { notification } });
};

export const markAllRead: RequestHandler = async (_request, response) => {
  const data = await notificationService.markAllNotificationsAsRead();
  response.json({ status: 'success', data });
};
