import Joi from 'joi';
import { paginationFields } from '../../core/validation/datatable.js';

export const dashboardQuerySchema = Joi.object({
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
  currency: Joi.string().valid('USD', 'CDF').default('CDF')
});

export const notificationsQuerySchema = Joi.object({
  ...paginationFields,
  unreadOnly: Joi.boolean().default(false)
});

export const notificationParamsSchema = Joi.object({
  id: Joi.string().uuid().required()
});
