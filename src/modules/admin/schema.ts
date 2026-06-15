import Joi from 'joi';

export const dashboardQuerySchema = Joi.object({
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
  currency: Joi.string().valid('USD', 'CDF').default('CDF')
});
