import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutBucketPolicyCommand,
  PutObjectCommand
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { fileTypeFromBuffer } from 'file-type';
import { getDatabasePool } from '../../core/config/database.js';
import { config } from '../../core/config/env.js';
import { getStorageClient } from '../../core/config/storage.js';
import { AppError } from '../../core/utils/appError.js';
import { createSlug } from '../../core/utils/slug.js';
import type { CreateBucketInput } from './schema.js';

const allowedImages = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif']
]);

const allowedVideos = new Map([
  ['video/mp4', 'mp4'],
  ['video/webm', 'webm'],
  ['video/quicktime', 'mov']
]);

async function getUploadPolicy() {
  const result = await getDatabasePool().query<{
    value: {
      maxImageSizeMb?: number;
      allowedImageTypes?: string[];
      maxVideoSizeMb?: number;
      allowedVideoTypes?: string[];
    };
  }>(
    `SELECT value FROM admin_settings WHERE section = 'storage'`
  );
  const value = result.rows[0]?.value;
  return {
    maxImageBytes: Math.min(
      (value?.maxImageSizeMb ?? 10) * 1024 * 1024,
      config.storage.maxFileSizeBytes
    ),
    maxVideoBytes: Math.min(
      (value?.maxVideoSizeMb ?? 100) * 1024 * 1024,
      config.storage.maxVideoFileSizeBytes
    ),
    allowedImageTypes: new Set(
      value?.allowedImageTypes ?? Array.from(allowedImages.keys())
    ),
    allowedVideoTypes: new Set(
      value?.allowedVideoTypes ?? Array.from(allowedVideos.keys())
    )
  };
}

function storageConfiguration() {
  const { publicBaseUrl, bucketPrefix } = config.storage;
  if (!publicBaseUrl) {
    throw new AppError(
      503,
      'Le stockage objet n’est pas configuré',
      'STORAGE_NOT_CONFIGURED'
    );
  }
  return {
    publicBaseUrl: publicBaseUrl.replace(/\/+$/, ''),
    bucketPrefix
  };
}

function providerBucketName(slug: string): string {
  return `${storageConfiguration().bucketPrefix}-${slug}`;
}

function publicObjectUrl(providerName: string, objectKey: string): string {
  const encodedKey = objectKey
    .split('/')
    .map(encodeURIComponent)
    .join('/');
  return `${storageConfiguration().publicBaseUrl}/${providerName}/${encodedKey}`;
}

function publicReadPolicy(providerName: string): string {
  return JSON.stringify({
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Principal: { AWS: ['*'] },
      Action: ['s3:GetObject'],
      Resource: [`arn:aws:s3:::${providerName}/*`]
    }]
  });
}

function storageErrorName(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    return String(error.name);
  }
  return undefined;
}

function isProviderBucketConflict(error: unknown): boolean {
  return [
    'BucketAlreadyOwnedByYou',
    'BucketAlreadyExists'
  ].includes(storageErrorName(error) ?? '');
}

function mapStorageError(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }
  if (isProviderBucketConflict(error)) {
    throw new AppError(
      409,
      'Un bucket avec ce nom existe deja dans le stockage',
      'STORAGE_BUCKET_CONFLICT'
    );
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  ) {
    throw new AppError(
      409,
      'Un bucket avec ce nom existe déjà',
      'STORAGE_BUCKET_CONFLICT'
    );
  }
  throw new AppError(
    503,
    'Le service de stockage est temporairement indisponible',
    'STORAGE_UNAVAILABLE'
  );
}

async function insertBucketRecord(
  input: CreateBucketInput,
  slug: string,
  providerName: string,
  adminId: string
) {
  const result = await getDatabasePool().query(
    `INSERT INTO storage_buckets(
       name, slug, provider_name, is_public, created_by
     )
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, slug, is_public, created_at`,
    [input.name, slug, providerName, input.public, adminId]
  );
  return { ...result.rows[0], objects_count: 0 };
}

export async function listBuckets() {
  const result = await getDatabasePool().query(
    `SELECT b.id, b.name, b.slug, b.is_public, b.created_at,
            COUNT(o.id)::INTEGER AS objects_count
     FROM storage_buckets b
     LEFT JOIN storage_objects o ON o.bucket_id = b.id
     GROUP BY b.id
     ORDER BY b.created_at DESC`
  );
  return result.rows;
}

export async function createBucket(
  input: CreateBucketInput,
  adminId: string
) {
  const slug = createSlug(input.name);
  if (slug.length < 3) {
    throw new AppError(
      400,
      'Le nom ne produit pas un slug de bucket valide',
      'INVALID_BUCKET_NAME'
    );
  }

  const providerName = providerBucketName(slug);
  const existing = await getDatabasePool().query(
    'SELECT 1 FROM storage_buckets WHERE slug = $1',
    [slug]
  );
  if (existing.rowCount) {
    throw new AppError(
      409,
      'Un bucket avec ce nom existe déjà',
      'STORAGE_BUCKET_CONFLICT'
    );
  }

  const storage = getStorageClient();
  let remoteCreated = false;

  try {
    try {
      await storage.send(new CreateBucketCommand({ Bucket: providerName }));
      remoteCreated = true;
    } catch (error) {
      if (!isProviderBucketConflict(error)) {
        throw error;
      }
    }

    if (input.public) {
      await storage.send(new PutBucketPolicyCommand({
        Bucket: providerName,
        Policy: publicReadPolicy(providerName)
      }));
    }

    return await insertBucketRecord(input, slug, providerName, adminId);
  } catch (error) {
    if (remoteCreated) {
      await storage.send(new DeleteBucketCommand({
        Bucket: providerName
      })).catch(() => undefined);
    }
    mapStorageError(error);
  }
}

async function findBucket(bucketId: string) {
  const result = await getDatabasePool().query<{
    id: string;
    provider_name: string;
    is_public: boolean;
  }>(
    `SELECT id, provider_name, is_public
     FROM storage_buckets
     WHERE id = $1`,
    [bucketId]
  );
  if (!result.rows[0]) {
    throw new AppError(404, 'Bucket introuvable', 'STORAGE_BUCKET_NOT_FOUND');
  }
  return result.rows[0];
}

export async function getPublicObject(
  providerName: string,
  objectKey: string
) {
  const bucketResult = await getDatabasePool().query<{
    id: string;
    is_public: boolean;
  }>(
    `SELECT id, is_public
     FROM storage_buckets
     WHERE provider_name = $1`,
    [providerName]
  );
  const bucket = bucketResult.rows[0];

  if (!bucket || !bucket.is_public) {
    throw new AppError(404, 'Objet introuvable', 'STORAGE_OBJECT_NOT_FOUND');
  }

  const objectResult = await getDatabasePool().query<{
    mime_type: string;
    size: string;
  }>(
    `SELECT mime_type, size
     FROM storage_objects
     WHERE bucket_id = $1 AND object_key = $2`,
    [bucket.id, objectKey]
  );
  const object = objectResult.rows[0];

  if (!object) {
    throw new AppError(404, 'Objet introuvable', 'STORAGE_OBJECT_NOT_FOUND');
  }

  try {
    const storageObject = await getStorageClient().send(new GetObjectCommand({
      Bucket: providerName,
      Key: objectKey
    }));

    if (!(storageObject.Body instanceof Readable)) {
      throw new Error('Unsupported storage object stream');
    }

    return {
      body: storageObject.Body,
      mimeType: storageObject.ContentType ?? object.mime_type,
      size: Number(storageObject.ContentLength ?? object.size),
      etag: storageObject.ETag
    };
  } catch (error) {
    mapStorageError(error);
  }
}

export async function listObjects(bucketId: string) {
  await findBucket(bucketId);
  const result = await getDatabasePool().query(
    `SELECT id, bucket_id, name, object_key, url, mime_type, size, created_at
     FROM storage_objects
     WHERE bucket_id = $1
     ORDER BY created_at DESC`,
    [bucketId]
  );
  return result.rows;
}

export async function uploadObject(
  bucketId: string,
  file: Express.Multer.File | undefined,
  adminId: string
) {
  if (!file) {
    throw new AppError(
      400,
      'Le fichier est requis dans la clé file',
      'FILE_REQUIRED'
    );
  }

  const detected = await fileTypeFromBuffer(file.buffer);
  const imageExtension = detected && allowedImages.get(detected.mime);
  const videoExtension = detected && allowedVideos.get(detected.mime);
  const extension = imageExtension ?? videoExtension;
  const policy = await getUploadPolicy();
  const isAllowedImage = Boolean(
    detected && imageExtension && policy.allowedImageTypes.has(detected.mime)
  );
  const isAllowedVideo = Boolean(
    detected && videoExtension && policy.allowedVideoTypes.has(detected.mime)
  );

  if (!detected || !extension || (!isAllowedImage && !isAllowedVideo)) {
    throw new AppError(
      415,
      'Seuls les fichiers JPEG, PNG, WebP, AVIF, MP4, WebM et MOV sont autorisés',
      'UNSUPPORTED_FILE_TYPE'
    );
  }
  const maxBytes = isAllowedVideo ? policy.maxVideoBytes : policy.maxImageBytes;
  if (file.size > maxBytes) {
    throw new AppError(
      413,
      'Le fichier dépasse la taille maximale autorisée',
      'FILE_TOO_LARGE'
    );
  }

  const bucket = await findBucket(bucketId);
  const now = new Date();
  const generatedName = `${randomUUID()}.${extension}`;
  const objectKey = [
    'uploads',
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    generatedName
  ].join('/');
  const storage = getStorageClient();
  let uploaded = false;

  try {
    const upload = await storage.send(new PutObjectCommand({
      Bucket: bucket.provider_name,
      Key: objectKey,
      Body: file.buffer,
      ContentType: detected.mime,
      ContentLength: file.size
    }));
    uploaded = true;

    const result = await getDatabasePool().query(
      `INSERT INTO storage_objects(
         bucket_id, name, object_key, url, mime_type,
         size, etag, uploaded_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, bucket_id, name, object_key, url,
                 mime_type, size, created_at`,
      [
        bucketId,
        generatedName,
        objectKey,
        publicObjectUrl(bucket.provider_name, objectKey),
        detected.mime,
        file.size,
        upload.ETag ?? null,
        adminId
      ]
    );
    return result.rows[0];
  } catch (error) {
    if (uploaded) {
      await storage.send(new DeleteObjectCommand({
        Bucket: bucket.provider_name,
        Key: objectKey
      })).catch(() => undefined);
    }
    mapStorageError(error);
  }
}

export async function deleteObject(
  bucketId: string,
  objectId: string
): Promise<void> {
  const result = await getDatabasePool().query<{
    provider_name: string;
    object_key: string;
  }>(
    `SELECT b.provider_name, o.object_key
     FROM storage_objects o
     JOIN storage_buckets b ON b.id = o.bucket_id
     WHERE o.id = $1 AND o.bucket_id = $2`,
    [objectId, bucketId]
  );
  const object = result.rows[0];
  if (!object) {
    throw new AppError(404, 'Objet introuvable', 'STORAGE_OBJECT_NOT_FOUND');
  }

  try {
    await getStorageClient().send(new DeleteObjectCommand({
      Bucket: object.provider_name,
      Key: object.object_key
    }));
    await getDatabasePool().query(
      'DELETE FROM storage_objects WHERE id = $1 AND bucket_id = $2',
      [objectId, bucketId]
    );
  } catch (error) {
    mapStorageError(error);
  }
}
