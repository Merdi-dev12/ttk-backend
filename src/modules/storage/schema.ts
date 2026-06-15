import Joi from 'joi';

export const createBucketSchema = Joi.object({
  name: Joi.string().trim().min(3).max(50).required(),
  public: Joi.boolean().default(true)
});

export const bucketParamsSchema = Joi.object({
  bucketId: Joi.string().uuid().required()
});

export const objectParamsSchema = Joi.object({
  bucketId: Joi.string().uuid().required(),
  objectId: Joi.string().uuid().required()
});

export interface CreateBucketInput {
  name: string;
  public: boolean;
}
