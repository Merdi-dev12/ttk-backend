import type { RequestHandler } from 'express';
import type {
  LoginInput,
  RegisterInput,
  VerifyOtpInput
} from './schema.js';
import { getProfile } from './profile.service.js';
import * as authService from './service.js';

export const register: RequestHandler = async (request, response) => {
  await authService.register(request.validated?.body as RegisterInput);
  response.status(202).json({
    status: 'success',
    message: 'OTP envoyé. Validez votre email pour créer le compte.'
  });
};

export const verifyRegistration: RequestHandler = async (request, response) => {
  const user = await authService.verifyRegistration(
    request.validated?.body as VerifyOtpInput
  );
  response.status(201).json({ status: 'success', data: { user } });
};

export const resendRegistrationOtp: RequestHandler = async (
  request,
  response
) => {
  const { email } = request.validated?.body as { email: string };
  await authService.resendRegistrationOtp(email);
  response.status(202).json({
    status: 'success',
    message: 'Un nouvel OTP a été envoyé.'
  });
};

export const login: RequestHandler = async (request, response) => {
  const data = await authService.login(
    request.validated?.body as LoginInput
  );
  response.json({ status: 'success', data });
};

export const refresh: RequestHandler = async (request, response) => {
  const { refreshToken } = request.validated?.body as {
    refreshToken: string;
  };
  const tokens = await authService.refresh(refreshToken);
  response.json({ status: 'success', data: tokens });
};

export const logout: RequestHandler = async (request, response) => {
  const { refreshToken } = request.validated?.body as {
    refreshToken: string;
  };
  await authService.logout(refreshToken);
  response.status(204).send();
};

export const forgotPassword: RequestHandler = async (request, response) => {
  const { email } = request.validated?.body as { email: string };
  await authService.forgotPassword(email);
  response.status(202).json({
    status: 'success',
    message: 'Si ce compte existe, un OTP a été envoyé.'
  });
};

export const resetPassword: RequestHandler = async (request, response) => {
  await authService.resetPassword(
    request.validated?.body as {
      email: string;
      otp: string;
      newPassword: string;
    }
  );
  response.json({
    status: 'success',
    message: 'Mot de passe réinitialisé.'
  });
};

export const changePassword: RequestHandler = async (request, response) => {
  const { currentPassword, newPassword } = request.validated?.body as {
    currentPassword: string;
    newPassword: string;
  };
  await authService.changePassword(
    request.auth!.userId,
    currentPassword,
    newPassword
  );
  response.json({
    status: 'success',
    message: 'Mot de passe modifié. Reconnectez-vous sur vos autres appareils.'
  });
};

export const profile: RequestHandler = async (request, response) => {
  const user = await getProfile(request.auth!.userId);
  response.json({ status: 'success', data: { user } });
};
