import type { RequestHandler } from 'express';
import * as orderService from './service.js';

type IdParams = { id: string };
type TokenParams = { token: string };

export const create: RequestHandler = async (request, response) => {
  const order = await orderService.createOrder(
    request.validated?.body as Parameters<typeof orderService.createOrder>[0]
  );
  response.status(201).json({ status: 'success', data: { order } });
};

export const listAdmin: RequestHandler = async (request, response) => {
  const data = await orderService.listAdminOrders(
    request.validated?.query as Parameters<typeof orderService.listAdminOrders>[0]
  );
  response.json({ status: 'success', data });
};

export const listMine: RequestHandler = async (request, response) => {
  const data = await orderService.listUserOrders(
    request.auth!.email,
    request.validated?.query as Parameters<typeof orderService.listUserOrders>[1]
  );
  response.json({ status: 'success', data });
};

export const getMine: RequestHandler = async (request, response) => {
  const { id } = request.validated?.params as IdParams;
  const order = await orderService.getUserOrder(id, request.auth!.email);
  response.json({ status: 'success', data: { order } });
};

export const getAdmin: RequestHandler = async (request, response) => {
  const { id } = request.validated?.params as IdParams;
  const order = await orderService.getAdminOrder(id);
  response.json({ status: 'success', data: { order } });
};

export const updateStatus: RequestHandler = async (request, response) => {
  const { id } = request.validated?.params as IdParams;
  const order = await orderService.updateOrderStatus(
    id,
    request.validated?.body as Parameters<typeof orderService.updateOrderStatus>[1],
    request.auth!.userId
  );
  response.json({ status: 'success', data: { order } });
};

export const remove: RequestHandler = async (request, response) => {
  const { id } = request.validated?.params as IdParams;
  await orderService.deleteOrder(id);
  response.status(204).send();
};

export const history: RequestHandler = async (request, response) => {
  const { id } = request.validated?.params as IdParams;
  const data = await orderService.listOrderHistory(id);
  response.json({ status: 'success', data });
};

export const getPayment: RequestHandler = async (request, response) => {
  const { token } = request.validated?.params as TokenParams;
  const order = await orderService.getPaymentOrderByToken(token);
  response.json({ status: 'success', data: { order } });
};
