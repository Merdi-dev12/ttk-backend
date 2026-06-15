import type { RequestHandler } from 'express';
import * as adminService from './service.js';

export const summary: RequestHandler = async (request, response) => {
  const data = await adminService.getDashboardSummary(
    request.validated?.query as Parameters<
      typeof adminService.getDashboardSummary
    >[0]
  );
  response.json({ status: 'success', data });
};

export const activity: RequestHandler = async (_request, response) => {
  const data = await adminService.getDashboardActivity();
  response.json({ status: 'success', data });
};
