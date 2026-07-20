import type { RequestHandler } from 'express';
import * as announcementService from './service.js';

type IdParams = { id: string };

export const listPublic: RequestHandler = async (request, response) => {
  const data = await announcementService.listPublicAnnouncements(
    request.validated?.query as { page: number; limit: number }
  );
  response.json({ status: 'success', data });
};

export const listAdmin: RequestHandler = async (request, response) => {
  const data = await announcementService.listAdminAnnouncements(
    request.validated?.query as Parameters<
      typeof announcementService.listAdminAnnouncements
    >[0]
  );
  response.json({ status: 'success', data });
};

export const getAdmin: RequestHandler = async (request, response) => {
  const { id } = request.validated?.params as IdParams;
  const announcement = await announcementService.getAdminAnnouncement(id);
  response.json({ status: 'success', data: { announcement } });
};

export const create: RequestHandler = async (request, response) => {
  const announcement = await announcementService.createAnnouncement(
    request.validated?.body as Parameters<
      typeof announcementService.createAnnouncement
    >[0],
    request.auth!.userId
  );
  response.status(201).json({ status: 'success', data: { announcement } });
};

export const update: RequestHandler = async (request, response) => {
  const { id } = request.validated?.params as IdParams;
  const announcement = await announcementService.updateAnnouncement(
    id,
    request.validated?.body as Parameters<
      typeof announcementService.updateAnnouncement
    >[1]
  );
  response.json({ status: 'success', data: { announcement } });
};

export const updateStatus: RequestHandler = async (request, response) => {
  const { id } = request.validated?.params as IdParams;
  const { status } = request.validated?.body as {
    status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  };
  const announcement = await announcementService.updateAnnouncementStatus(
    id,
    status
  );
  response.json({ status: 'success', data: { announcement } });
};

export const remove: RequestHandler = async (request, response) => {
  const { id } = request.validated?.params as IdParams;
  await announcementService.deleteAnnouncement(id);
  response.status(204).send();
};
