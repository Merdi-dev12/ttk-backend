import { Router } from 'express';
import { authenticate } from '../../core/middlewares/auth.middleware.js';
import { requireRole } from '../../core/middlewares/role.middleware.js';
import { validate } from '../../core/middlewares/validate.middleware.js';
import { catchAsync } from '../../core/utils/catchAsync.js';
import * as controller from './controller.js';
import {
  bucketParamsSchema,
  createBucketSchema,
  objectParamsSchema
} from './schema.js';
import { uploadImage } from './upload.middleware.js';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));
router.get('/buckets', catchAsync(controller.listBuckets));
router.post(
  '/buckets',
  validate({ body: createBucketSchema }),
  catchAsync(controller.createBucket)
);
router.get(
  '/buckets/:bucketId/objects',
  validate({ params: bucketParamsSchema }),
  catchAsync(controller.listObjects)
);
router.post(
  '/buckets/:bucketId/objects',
  validate({ params: bucketParamsSchema }),
  uploadImage,
  catchAsync(controller.uploadObject)
);
router.delete(
  '/buckets/:bucketId/objects/:objectId',
  validate({ params: objectParamsSchema }),
  catchAsync(controller.deleteObject)
);

export default router;
