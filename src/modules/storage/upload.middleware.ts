import type { RequestHandler } from 'express';
import multer from 'multer';
import { config } from '../../core/config/env.js';
import { AppError } from '../../core/utils/appError.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: Math.max(
      config.storage.maxFileSizeBytes,
      config.storage.maxVideoFileSizeBytes
    )
  }
});

export const uploadImage: RequestHandler = (request, response, next) => {
  upload.single('file')(request, response, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        next(new AppError(
          413,
          'Le fichier dépasse la taille maximale autorisée',
          'FILE_TOO_LARGE'
        ));
        return;
      }
      next(new AppError(400, error.message, 'INVALID_MULTIPART_REQUEST'));
      return;
    }

    next(error);
  });
};
