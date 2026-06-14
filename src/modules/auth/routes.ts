import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../../core/config/env.js';
import { authenticate } from '../../core/middlewares/auth.middleware.js';
import { validate } from '../../core/middlewares/validate.middleware.js';
import { catchAsync } from '../../core/utils/catchAsync.js';
import * as controller from './controller.js';
import {
  changePasswordSchema,
  emailSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyRegistrationSchema
} from './schema.js';

const router = Router();
const authLimiter = rateLimit({
  windowMs: config.auth.rateLimitWindowMs,
  limit: config.auth.rateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

router.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  catchAsync(controller.register)
);
router.post(
  '/register/verify',
  authLimiter,
  validate({ body: verifyRegistrationSchema }),
  catchAsync(controller.verifyRegistration)
);
router.post(
  '/register/resend-otp',
  authLimiter,
  validate({ body: emailSchema }),
  catchAsync(controller.resendRegistrationOtp)
);
router.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  catchAsync(controller.login)
);
router.post(
  '/refresh',
  authLimiter,
  validate({ body: refreshSchema }),
  catchAsync(controller.refresh)
);
router.post(
  '/logout',
  validate({ body: refreshSchema }),
  catchAsync(controller.logout)
);
router.post(
  '/forgot-password',
  authLimiter,
  validate({ body: emailSchema }),
  catchAsync(controller.forgotPassword)
);
router.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  catchAsync(controller.resetPassword)
);
router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  catchAsync(controller.changePassword)
);
router.get('/me', authenticate, catchAsync(controller.profile));

export default router;
