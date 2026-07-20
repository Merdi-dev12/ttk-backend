import Joi from 'joi';
import {
  dataTableFields,
  paginationFields
} from '../../core/validation/datatable.js';

const uuid = Joi.string().uuid().required();
const status = Joi.string().valid('ACTIVE', 'SUSPENDED', 'DELETED');
const url = Joi.string().uri().max(2048);

export const announcementParamsSchema = Joi.object({
  id: uuid
});

export const publicAnnouncementsQuerySchema = Joi.object({
  ...paginationFields
});

export const adminAnnouncementsQuerySchema = Joi.object({
  ...dataTableFields,
  status: status.optional(),
  sortBy: Joi.string()
    .valid('name', 'status', 'created_at', 'updated_at')
    .default('created_at')
});

export const createAnnouncementSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  description: Joi.string().trim().max(5000).allow(null, '').optional(),
  imageUrl: url.required(),
  status: status.default('ACTIVE')
});

export const updateAnnouncementSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150),
  description: Joi.string().trim().max(5000).allow(null, ''),
  imageUrl: url,
  status
}).min(1);

export const announcementStatusSchema = Joi.object({
  status: status.required()
});
