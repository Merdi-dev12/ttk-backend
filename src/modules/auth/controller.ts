import type { Request, RequestHandler } from 'express';
import type {
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  VerifyOtpInput
} from './schema.js';
import {
  getProfile,
  updateProfile as updateProfileService
} from './profile.service.js';
import * as authService from './service.js';
import { loginWithGoogle } from './google.service.js';
import {
  listSessions as listUserSessions,
  revokeSession as revokeUserSession
} from './token.service.js';

function sessionMetadata(request: Request) {
  return {
    userAgent: request.get('user-agent')?.slice(0, 500),
    ipAddress: request.ip
  };
}

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
    request.validated?.body as LoginInput,
    sessionMetadata(request)
  );
  response.json({ status: 'success', data });
};

export const googleLogin: RequestHandler = async (request, response) => {
  const { credential } = request.validated?.body as { credential: string };
  const data = await loginWithGoogle(credential, sessionMetadata(request));
  response.json({ status: 'success', data });
};

export const refresh: RequestHandler = async (request, response) => {
  const { refreshToken } = request.validated?.body as {
    refreshToken: string;
  };
  const tokens = await authService.refresh(
    refreshToken,
    sessionMetadata(request)
  );
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

export const updateProfile: RequestHandler = async (request, response) => {
  const user = await updateProfileService(
    request.auth!.userId,
    request.validated?.body as UpdateProfileInput
  );
  response.json({ status: 'success', data: { user } });
};

export const listSessions: RequestHandler = async (request, response) => {
  const sessions = await listUserSessions(request.auth!.userId);
  response.json({ status: 'success', data: { sessions } });
};

export const revokeSession: RequestHandler = async (request, response) => {
  const { sessionId } = request.validated?.params as { sessionId: string };
  await revokeUserSession(request.auth!.userId, sessionId);
  response.status(204).send();
};
