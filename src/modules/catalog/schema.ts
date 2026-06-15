import Joi from 'joi';
import {
  dataTableFields,
  paginationFields
} from '../../core/validation/datatable.js';

const uuid = Joi.string().uuid().required();
const status = Joi.string().valid('ACTIVE', 'SUSPENDED', 'DELETED');
const url = Joi.string().uri().max(2048);

export const idParamsSchema = Joi.object({ id: uuid });
export const serviceIdParamsSchema = Joi.object({ serviceId: uuid });
export const productIdParamsSchema = Joi.object({ productId: uuid });
export const productImageParamsSchema = Joi.object({
  productId: uuid,
  imageId: uuid
});
export const productModalityParamsSchema = Joi.object({
  productId: uuid,
  modalityId: uuid
});
export const serviceFieldParamsSchema = Joi.object({
  serviceId: uuid,
  fieldId: uuid
});
export const slugParamsSchema = Joi.object({
  slug: Joi.string().trim().max(120).required()
});

export const paginationSchema = Joi.object({
  ...paginationFields
});

export const searchSchema = paginationSchema.keys({
  q: Joi.string().trim().min(1).max(200).required(),
  kind: Joi.string().valid('SERVICE', 'PRODUCT').optional()
});

export const adminServicesQuerySchema = Joi.object({
  ...dataTableFields,
  status: status.optional(),
  type: Joi.string().valid('PRODUCTS', 'FORM').optional(),
  sortBy: Joi.string()
    .valid('name', 'type', 'status', 'created_at', 'updated_at')
    .default('created_at'),
  includeCounts: Joi.boolean().default(false)
});

export const adminProductsQuerySchema = Joi.object({
  ...dataTableFields,
  sortBy: Joi.string()
    .valid('name', 'status', 'created_at', 'updated_at', 'minPrice', 'maxPrice')
    .default('created_at'),
  serviceId: Joi.string().uuid().optional(),
  status: status.optional(),
  currency: Joi.string().valid('USD', 'CDF').optional(),
  availability: Joi.string()
    .valid('AVAILABLE', 'UNAVAILABLE', 'ON_REQUEST')
    .optional(),
  hasDiscount: Joi.boolean().optional()
});

export const createServiceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  description: Joi.string().trim().max(5000).allow(null, '').optional(),
  imageUrl: url.allow(null, '').optional(),
  type: Joi.string().valid('PRODUCTS', 'FORM').required()
});

export const updateServiceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  description: Joi.string().trim().max(5000).allow(null, ''),
  imageUrl: url.allow(null, '')
}).min(1);

export const statusSchema = Joi.object({ status: status.required() });

export const createFieldSchema = Joi.object({
  technicalName: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z][a-z0-9_]*$/)
    .invalid('email')
    .max(50)
    .required(),
  label: Joi.string().trim().min(1).max(150).required(),
  fieldType: Joi.string()
    .valid('TEXT', 'NUMBER', 'DATE', 'SELECT', 'FILE', 'TEXTAREA', 'PHONE')
    .required(),
  required: Joi.boolean().default(true),
  options: Joi.when('fieldType', {
    is: 'SELECT',
    then: Joi.array().items(Joi.string().trim().min(1).max(100)).min(1).required(),
    otherwise: Joi.forbidden()
  }),
  displayOrder: Joi.number().integer().min(0).default(0)
});

export const updateFieldSchema = Joi.object({
  label: Joi.string().trim().min(1).max(150),
  required: Joi.boolean(),
  options: Joi.array().items(Joi.string().trim().min(1).max(100)).min(1),
  displayOrder: Joi.number().integer().min(0)
}).min(1);

export const imageSchema = Joi.object({
  url: url.required(),
  isPrimary: Joi.boolean().default(false),
  displayOrder: Joi.number().integer().min(0).default(0)
});

export const modalitySchema = Joi.object({
  label: Joi.string().trim().min(1).max(100).required(),
  price: Joi.number().precision(2).min(0).required(),
  currency: Joi.string().valid('USD', 'CDF').default('CDF'),
  availability: Joi.string()
    .valid('AVAILABLE', 'UNAVAILABLE', 'ON_REQUEST')
    .default('AVAILABLE'),
  additionalAttributes: Joi.object().unknown(true).allow(null).optional()
});

export const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  description: Joi.string().trim().max(10000).allow(null, '').optional(),
  adminNote: Joi.string().trim().max(5000).allow(null, '').optional(),
  images: Joi.array().items(imageSchema).max(20).default([]),
  modalities: Joi.array().items(modalitySchema).max(50).default([])
}).custom((value, helpers) => {
  const primaryCount = value.images.filter(
    (image: { isPrimary: boolean }) => image.isPrimary
  ).length;
  return primaryCount > 1
    ? helpers.error('any.invalid', { message: 'Une seule image principale est autorisée' })
    : value;
});

export const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150),
  description: Joi.string().trim().max(10000).allow(null, ''),
  adminNote: Joi.string().trim().max(5000).allow(null, '')
}).min(1);

export const updateImageSchema = imageSchema.fork(
  ['url', 'isPrimary', 'displayOrder'],
  (field) => field.optional()
).min(1);

export const updateModalitySchema = modalitySchema.fork(
  ['label', 'price', 'currency', 'availability'],
  (field) => field.optional()
).min(1);

export const applyDiscountSchema = Joi.object({
  price: Joi.number().precision(2).min(0).required()
});
