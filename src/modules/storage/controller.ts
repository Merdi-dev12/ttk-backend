import type { RequestHandler } from 'express';
import * as storageService from './service.js';
import type { CreateBucketInput } from './schema.js';

export const listBuckets: RequestHandler = async (_request, response) => {
  const buckets = await storageService.listBuckets();
  response.json({ status: 'success', data: { buckets } });
};

export const createBucket: RequestHandler = async (request, response) => {
  const bucket = await storageService.createBucket(
    request.validated?.body as CreateBucketInput,
    request.auth!.userId
  );
  response.status(201).json({ status: 'success', data: { bucket } });
};

export const listObjects: RequestHandler = async (request, response) => {
  const { bucketId } = request.validated?.params as { bucketId: string };
  const items = await storageService.listObjects(bucketId);
  response.json({ status: 'success', data: { items } });
};

export const uploadObject: RequestHandler = async (request, response) => {
  const { bucketId } = request.validated?.params as { bucketId: string };
  const object = await storageService.uploadObject(
    bucketId,
    request.file,
    request.auth!.userId
  );
  response.status(201).json({ status: 'success', data: { object } });
};

export const deleteObject: RequestHandler = async (request, response) => {
  const { bucketId, objectId } = request.validated?.params as {
    bucketId: string;
    objectId: string;
  };
  await storageService.deleteObject(bucketId, objectId);
  response.status(204).send();
};
