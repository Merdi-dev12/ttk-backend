import Joi from 'joi';
import { dataTableFields } from '../../core/validation/datatable.js';

export const userIdParamsSchema = Joi.object({
  id: Joi.string().uuid().required()
});

export const listUsersQuerySchema = Joi.object({
  ...dataTableFields,
  status: Joi.string().valid('ACTIVE', 'REVOKED').optional(),
  role: Joi.string().valid('USER', 'ADMIN').default('USER'),
  sortBy: Joi.string()
    .valid('nom', 'email', 'status', 'created_at')
    .default('created_at')
});

export const updateUserStatusSchema = Joi.object({
  status: Joi.string().valid('ACTIVE', 'REVOKED').required()
});
