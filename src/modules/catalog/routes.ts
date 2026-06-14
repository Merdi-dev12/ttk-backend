import { Router } from 'express';
import { authenticate } from '../../core/middlewares/auth.middleware.js';
import { requireRole } from '../../core/middlewares/role.middleware.js';
import { validate } from '../../core/middlewares/validate.middleware.js';
import { catchAsync } from '../../core/utils/catchAsync.js';
import * as controller from './controller.js';
import {
  applyDiscountSchema,
  adminServicesQuerySchema,
  createFieldSchema,
  createProductSchema,
  createServiceSchema,
  idParamsSchema,
  imageSchema,
  modalitySchema,
  paginationSchema,
  productIdParamsSchema,
  productImageParamsSchema,
  productModalityParamsSchema,
  searchSchema,
  serviceFieldParamsSchema,
  serviceIdParamsSchema,
  slugParamsSchema,
  statusSchema,
  updateFieldSchema,
  updateImageSchema,
  updateModalitySchema,
  updateProductSchema,
  updateServiceSchema
} from './schema.js';

const router = Router();
const admin = Router();

admin.use(authenticate, requireRole('ADMIN'));
admin.get(
  '/services',
  validate({ query: adminServicesQuerySchema }),
  catchAsync(controller.listAdminServices)
);
admin.post(
  '/services',
  validate({ body: createServiceSchema }),
  catchAsync(controller.createService)
);
admin.patch(
  '/services/:id',
  validate({ params: idParamsSchema, body: updateServiceSchema }),
  catchAsync(controller.updateService)
);
admin.patch(
  '/services/:id/status',
  validate({ params: idParamsSchema, body: statusSchema }),
  catchAsync(controller.updateServiceStatus)
);
admin.post(
  '/services/:serviceId/fields',
  validate({ params: serviceIdParamsSchema, body: createFieldSchema }),
  catchAsync(controller.createFormField)
);
admin.patch(
  '/services/:serviceId/fields/:fieldId',
  validate({ params: serviceFieldParamsSchema, body: updateFieldSchema }),
  catchAsync(controller.updateFormField)
);
admin.delete(
  '/services/:serviceId/fields/:fieldId',
  validate({ params: serviceFieldParamsSchema }),
  catchAsync(controller.deleteFormField)
);
admin.get(
  '/services/:serviceId/products',
  validate({ params: serviceIdParamsSchema, query: paginationSchema }),
  catchAsync(controller.listAdminProducts)
);
admin.post(
  '/services/:serviceId/products',
  validate({ params: serviceIdParamsSchema, body: createProductSchema }),
  catchAsync(controller.createProduct)
);
admin.get(
  '/products/:id',
  validate({ params: idParamsSchema }),
  catchAsync(controller.getAdminProduct)
);
admin.patch(
  '/products/:id',
  validate({ params: idParamsSchema, body: updateProductSchema }),
  catchAsync(controller.updateProduct)
);
admin.patch(
  '/products/:id/status',
  validate({ params: idParamsSchema, body: statusSchema }),
  catchAsync(controller.updateProductStatus)
);
admin.post(
  '/products/:productId/images',
  validate({ params: productIdParamsSchema, body: imageSchema }),
  catchAsync(controller.addImage)
);
admin.patch(
  '/products/:productId/images/:imageId',
  validate({ params: productImageParamsSchema, body: updateImageSchema }),
  catchAsync(controller.updateImage)
);
admin.delete(
  '/products/:productId/images/:imageId',
  validate({ params: productImageParamsSchema }),
  catchAsync(controller.deleteImage)
);
admin.post(
  '/products/:productId/modalities',
  validate({ params: productIdParamsSchema, body: modalitySchema }),
  catchAsync(controller.addModality)
);
admin.patch(
  '/products/:productId/modalities/:modalityId',
  validate({ params: productModalityParamsSchema, body: updateModalitySchema }),
  catchAsync(controller.updateModality)
);
admin.patch(
  '/products/:productId/modalities/:modalityId/discount',
  validate({
    params: productModalityParamsSchema,
    body: applyDiscountSchema
  }),
  catchAsync(controller.applyDiscount)
);
admin.delete(
  '/products/:productId/modalities/:modalityId/discount',
  validate({ params: productModalityParamsSchema }),
  catchAsync(controller.removeDiscount)
);
admin.delete(
  '/products/:productId/modalities/:modalityId',
  validate({ params: productModalityParamsSchema }),
  catchAsync(controller.deleteModality)
);

router.use('/admin', admin);
router.get('/currencies', catchAsync(controller.listCurrencies));
router.get(
  '/search',
  validate({ query: searchSchema }),
  catchAsync(controller.search)
);
router.get(
  '/services',
  validate({ query: paginationSchema }),
  catchAsync(controller.listPublicServices)
);
router.get(
  '/services/:slug/products',
  validate({ params: slugParamsSchema, query: paginationSchema }),
  catchAsync(controller.listPublicProducts)
);
router.get(
  '/services/:slug',
  validate({ params: slugParamsSchema }),
  catchAsync(controller.getPublicService)
);
router.get(
  '/products/:id',
  validate({ params: idParamsSchema }),
  catchAsync(controller.getPublicProduct)
);

export default router;
