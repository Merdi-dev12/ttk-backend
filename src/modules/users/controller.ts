import type { RequestHandler } from 'express';
import * as userService from './service.js';

export const listUsers: RequestHandler = async (request, response) => {
  const data = await userService.listUsers(
    request.validated?.query as Parameters<typeof userService.listUsers>[0]
  );
  response.json({ status: 'success', data });
};

export const updateUserStatus: RequestHandler = async (request, response) => {
  const { id } = request.validated?.params as { id: string };
  const { status } = request.validated?.body as { status: string };
  const user = await userService.updateUserStatus(id, status);
  response.json({ status: 'success', data: { user } });
};

export const getUser: RequestHandler = async (request, response) => {
  const { id } = request.validated?.params as { id: string };
  const user = await userService.getUser(id);
  response.json({ status: 'success', data: { user } });
};
