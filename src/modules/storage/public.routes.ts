import { Router } from 'express';
import { catchAsync } from '../../core/utils/catchAsync.js';
import * as controller from './controller.js';

const router = Router();

router.get('/:providerName/*objectKey', catchAsync(controller.getPublicObject));

export default router;
