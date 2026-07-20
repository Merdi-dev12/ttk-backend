import { Router } from 'express';
import { catchAsync } from '../../core/utils/catchAsync.js';
import * as resendController from './resend.controller.js';

const router = Router();

router.post('/resend/email', catchAsync(resendController.receiveEmail));

export default router;
