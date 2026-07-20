import Joi from 'joi';

export const contactSchema = Joi.object({
  nom: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().email().lowercase().trim().max(150).required(),
  sujet: Joi.string().trim().min(3).max(180).required(),
  message: Joi.string().trim().min(10).max(5000).required()
});

export interface ContactInput {
  nom: string;
  email: string;
  sujet: string;
  message: string;
}
