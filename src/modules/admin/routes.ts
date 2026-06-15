import { Router } from 'express';
import { authenticate } from '../../core/middlewares/auth.middleware.js';
import { requireRole } from '../../core/middlewares/role.middleware.js';
import { validate } from '../../core/middlewares/validate.middleware.js';
import { catchAsync } from '../../core/utils/catchAsync.js';
import * as controller from './controller.js';
import { dashboardQuerySchema } from './schema.js';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));
router.get(
  '/dashboard/summary',
  validate({ query: dashboardQuerySchema }),
  catchAsync(controller.summary)
);
router.get('/dashboard/activity', catchAsync(controller.activity));

export default router;
