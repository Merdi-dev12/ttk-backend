import Joi from 'joi';
import {
  dataTableFields,
  paginationFields
} from '../../core/validation/datatable.js';

const uuid = Joi.string().uuid().required();

export const orderParamsSchema = Joi.object({
  id: uuid
});

export const paymentTokenParamsSchema = Joi.object({
  token: uuid
});

export const createOrderSchema = Joi.object({
  serviceId: Joi.string().uuid().required(),
  productId: Joi.string().uuid().optional(),
  modalityId: Joi.string().uuid().optional(),
  customerName: Joi.string().trim().min(2).max(150).required(),
  customerEmail: Joi.string().email().lowercase().trim().max(150).required(),
  customerPhone: Joi.string()
    .trim()
    .pattern(/^\+?[0-9\s().-]{7,30}$/)
    .required(),
  customerAddress: Joi.string().trim().min(3).max(500).required(),
  customerSex: Joi.string()
    .valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY')
    .required(),
  customerAge: Joi.number().integer().min(13).max(120).required(),
  message: Joi.string().trim().max(5000).allow(null, '').optional(),
  metadata: Joi.object().unknown(true).allow(null).optional()
});

export const publicOrderQuerySchema = Joi.object({
  ...paginationFields,
  status: Joi.string().valid('PENDING', 'APPROVED', 'CANCELLED').optional()
});

export const adminOrdersQuerySchema = Joi.object({
  ...dataTableFields,
  limit: Joi.number().integer().min(1).max(500).default(20),
  status: Joi.string().valid('PENDING', 'APPROVED', 'CANCELLED').optional(),
  serviceId: Joi.string().uuid().optional(),
  sortBy: Joi.string()
    .valid('reference', 'status', 'customerName', 'created_at', 'updated_at')
    .default('created_at')
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid('PENDING', 'APPROVED', 'CANCELLED').required(),
  adminNote: Joi.string().trim().max(5000).allow(null, '').optional()
});
