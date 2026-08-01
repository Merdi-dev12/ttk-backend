import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../core/middlewares/auth.middleware.js';
import { requireRole } from '../../core/middlewares/role.middleware.js';
import { validate } from '../../core/middlewares/validate.middleware.js';
import { catchAsync } from '../../core/utils/catchAsync.js';
import * as controller from './controller.js';
import {
  adminOrdersQuerySchema,
  createOrderSchema,
  orderParamsSchema,
  paymentTokenParamsSchema,
  publicOrderQuerySchema,
  updateOrderStatusSchema
} from './schema.js';

const router = Router();
const admin = Router();
const orderSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

admin.use(authenticate, requireRole('ADMIN'));
admin.get(
  '/',
  validate({ query: adminOrdersQuerySchema }),
  catchAsync(controller.listAdmin)
);
admin.get(
  '/:id',
  validate({ params: orderParamsSchema }),
  catchAsync(controller.getAdmin)
);
admin.get(
  '/:id/history',
  validate({ params: orderParamsSchema }),
  catchAsync(controller.history)
);
admin.patch(
  '/:id/status',
  validate({ params: orderParamsSchema, body: updateOrderStatusSchema }),
  catchAsync(controller.updateStatus)
);
admin.delete(
  '/:id',
  validate({ params: orderParamsSchema }),
  catchAsync(controller.remove)
);

router.use('/admin', admin);
router.post(
  '/',
  orderSubmissionLimiter,
  validate({ body: createOrderSchema }),
  catchAsync(controller.create)
);
router.get(
  '/me',
  authenticate,
  validate({ query: publicOrderQuerySchema }),
  catchAsync(controller.listMine)
);
router.get(
  '/me/:id',
  authenticate,
  validate({ params: orderParamsSchema }),
  catchAsync(controller.getMine)
);
router.get(
  '/payment/:token',
  validate({ params: paymentTokenParamsSchema }),
  catchAsync(controller.getPayment)
);

export default router;
