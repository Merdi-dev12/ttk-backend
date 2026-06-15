import Joi from 'joi';

export const paginationFields = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().valid(5, 10, 20, 50, 100).default(20)
};

export const dataTableFields = {
  ...paginationFields,
  search: Joi.string().trim().max(200).optional(),
  sortOrder: Joi.string().lowercase().valid('asc', 'desc').default('desc'),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional()
};

export interface DataTableInput {
  page: number;
  limit: number;
  search?: string;
  sortOrder: 'asc' | 'desc';
  dateFrom?: Date;
  dateTo?: Date;
}
