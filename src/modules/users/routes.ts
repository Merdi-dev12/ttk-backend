import { Router } from 'express';
import { authenticate } from '../../core/middlewares/auth.middleware.js';
import { requireRole } from '../../core/middlewares/role.middleware.js';
import { validate } from '../../core/middlewares/validate.middleware.js';
import { catchAsync } from '../../core/utils/catchAsync.js';
import * as controller from './controller.js';
import {
  listUsersQuerySchema,
  updateUserStatusSchema,
  userIdParamsSchema
} from './schema.js';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));
router.get(
  '/',
  validate({ query: listUsersQuerySchema }),
  catchAsync(controller.listUsers)
);
router.patch(
  '/:id/status',
  validate({
    params: userIdParamsSchema,
    body: updateUserStatusSchema
  }),
  catchAsync(controller.updateUserStatus)
);

export default router;
