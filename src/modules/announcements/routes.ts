import { Router } from 'express';
import { authenticate } from '../../core/middlewares/auth.middleware.js';
import { requireRole } from '../../core/middlewares/role.middleware.js';
import { validate } from '../../core/middlewares/validate.middleware.js';
import { catchAsync } from '../../core/utils/catchAsync.js';
import * as controller from './controller.js';
import {
  adminAnnouncementsQuerySchema,
  announcementParamsSchema,
  announcementStatusSchema,
  createAnnouncementSchema,
  publicAnnouncementsQuerySchema,
  updateAnnouncementSchema
} from './schema.js';

const router = Router();
const admin = Router();

admin.use(authenticate, requireRole('ADMIN'));
admin.get(
  '/',
  validate({ query: adminAnnouncementsQuerySchema }),
  catchAsync(controller.listAdmin)
);
admin.post(
  '/',
  validate({ body: createAnnouncementSchema }),
  catchAsync(controller.create)
);
admin.get(
  '/:id',
  validate({ params: announcementParamsSchema }),
  catchAsync(controller.getAdmin)
);
admin.patch(
  '/:id',
  validate({ params: announcementParamsSchema, body: updateAnnouncementSchema }),
  catchAsync(controller.update)
);
admin.patch(
  '/:id/status',
  validate({ params: announcementParamsSchema, body: announcementStatusSchema }),
  catchAsync(controller.updateStatus)
);
admin.delete(
  '/:id',
  validate({ params: announcementParamsSchema }),
  catchAsync(controller.remove)
);

router.use('/admin', admin);
router.get(
  '/',
  validate({ query: publicAnnouncementsQuerySchema }),
  catchAsync(controller.listPublic)
);

export default router;
