import type { RequestHandler } from 'express';
import type Joi from 'joi';
import { AppError } from '../utils/appError.js';

interface ValidationSchemas {
  body?: Joi.Schema;
  params?: Joi.Schema;
  query?: Joi.Schema;
}

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (request, _response, next) => {
    const validated: Express.Request['validated'] = {};

    for (const key of ['body', 'params', 'query'] as const) {
      const schema = schemas[key];
      if (!schema) {
        continue;
      }

      const { value, error } = schema.validate(request[key], {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        return next(new AppError(400, error.message, 'VALIDATION_ERROR'));
      }

      validated[key] = value;
    }

    request.validated = validated;
    next();
  };
}
