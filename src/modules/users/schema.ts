import Joi from 'joi';

export const userIdParamsSchema = Joi.object({
  id: Joi.string().uuid().required()
});

export const listUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('ACTIVE', 'REVOKED').optional(),
  search: Joi.string().trim().max(150).optional()
});

export const updateUserStatusSchema = Joi.object({
  status: Joi.string().valid('ACTIVE', 'REVOKED').required()
});
