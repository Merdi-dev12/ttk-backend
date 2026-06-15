import Joi from 'joi';

const email = Joi.string().email().lowercase().trim().max(150).required();
const otp = Joi.string().pattern(/^\d{6}$/).required();
const password = Joi.string()
  .min(8)
  .max(72)
  .pattern(/[a-z]/, 'lowercase')
  .pattern(/[A-Z]/, 'uppercase')
  .pattern(/[0-9]/, 'number')
  .required();

export const registerSchema = Joi.object({
  nom: Joi.string().trim().min(2).max(100).required(),
  postnom: Joi.string().trim().min(2).max(100).allow(null, '').optional(),
  email,
  password
});

export const verifyRegistrationSchema = Joi.object({
  email,
  otp
});

export const emailSchema = Joi.object({ email });

export const loginSchema = Joi.object({
  email,
  password: Joi.string().max(72).required()
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().min(40).required()
});

export const resetPasswordSchema = Joi.object({
  email,
  otp,
  newPassword: password
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().max(72).required(),
  newPassword: password
});

export const updateProfileSchema = Joi.object({
  nom: Joi.string().trim().min(2).max(100),
  postnom: Joi.string().trim().min(2).max(100).allow(null, ''),
  avatarUrl: Joi.string().uri().max(2048).allow(null, '')
}).min(1);

export const sessionParamsSchema = Joi.object({
  sessionId: Joi.string().uuid().required()
});

export type RegisterInput = {
  nom: string;
  postnom?: string | null;
  email: string;
  password: string;
};

export type VerifyOtpInput = {
  email: string;
  otp: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type UpdateProfileInput = {
  nom?: string;
  postnom?: string | null;
  avatarUrl?: string | null;
};
