import { S3Client } from '@aws-sdk/client-s3';
import { config } from './env.js';

let client: S3Client | undefined;

export function getStorageClient(): S3Client {
  const { endpoint, region, accessKey, secretKey, forcePathStyle } =
    config.storage;

  if (!endpoint || !accessKey || !secretKey) {
    throw new Error('Storage S3 configuration is incomplete');
  }

  client ??= new S3Client({
    endpoint,
    region,
    forcePathStyle,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey
    }
  });

  return client;
}
