import { Router } from 'express';
import { authenticate } from '../../core/middlewares/auth.middleware.js';
import { requireRole } from '../../core/middlewares/role.middleware.js';
import { validate } from '../../core/middlewares/validate.middleware.js';
import { catchAsync } from '../../core/utils/catchAsync.js';
import * as controller from './controller.js';
import * as notificationsController from './notifications.controller.js';
import {
  dashboardQuerySchema,
  notificationParamsSchema,
  notificationsQuerySchema
} from './schema.js';
import * as settingsController from './settings.controller.js';
import {
  settingsSchemas,
  testEmailSchema
} from './settings.schema.js';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));
router.get(
  '/dashboard/summary',
  validate({ query: dashboardQuerySchema }),
  catchAsync(controller.summary)
);
router.get('/dashboard/activity', catchAsync(controller.activity));
router.get(
  '/notifications',
  validate({ query: notificationsQuerySchema }),
  catchAsync(notificationsController.list)
);
router.get('/notifications/unread-count', catchAsync(notificationsController.unreadCount));
router.patch(
  '/notifications/:id/read',
  validate({ params: notificationParamsSchema }),
  catchAsync(notificationsController.markRead)
);
router.patch('/notifications/read-all', catchAsync(notificationsController.markAllRead));
router.get('/settings', catchAsync(settingsController.getSettings));

for (const section of Object.keys(settingsSchemas) as Array<
  keyof typeof settingsSchemas
>) {
  router.patch(
    `/settings/${section}`,
    validate({ body: settingsSchemas[section] }),
    catchAsync(settingsController.updateSection(section))
  );
}

router.post(
  '/settings/notifications/test-email',
  validate({ body: testEmailSchema }),
  catchAsync(settingsController.testEmail)
);
router.post(
  '/settings/maintenance/clear-cache',
  catchAsync(settingsController.clearCache)
);

export default router;
