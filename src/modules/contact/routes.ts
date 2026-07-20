import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../core/middlewares/validate.middleware.js';
import { catchAsync } from '../../core/utils/catchAsync.js';
import * as controller from './controller.js';
import { contactSchema } from './schema.js';

const router = Router();
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

router.post(
  '/',
  contactLimiter,
  validate({ body: contactSchema }),
  catchAsync(controller.submitContact)
);

export default router;
