import crypto from 'node:crypto';
import type { RequestHandler } from 'express';
import { logger } from '../utils/logger.js';

const sensitiveQueryPattern =
  /authorization|password|secret|token|otp|api[-_]?key|access[-_]?key|refresh/i;

function requestIdFromHeader(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;

  if (raw && /^[a-zA-Z0-9._:-]{8,128}$/.test(raw)) {
    return raw;
  }

  return crypto.randomUUID();
}

function redactUrl(originalUrl: string): string {
  const url = new URL(originalUrl, 'http://localhost');

  for (const key of Array.from(url.searchParams.keys())) {
    if (sensitiveQueryPattern.test(key)) {
      url.searchParams.set(key, '[REDACTED]');
    }
  }

  return `${url.pathname}${url.search}`;
}

export const requestLogger: RequestHandler = (request, response, next) => {
  const startedAt = process.hrtime.bigint();
  const requestId = requestIdFromHeader(request.headers['x-request-id']);

  response.locals.requestId = requestId;
  response.setHeader('X-Request-Id', requestId);

  response.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const level = response.statusCode >= 500 ? 'error' : 'http';

    logger.log(level, 'http_request', {
      requestId,
      method: request.method,
      path: redactUrl(request.originalUrl),
      statusCode: response.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      ip: request.ip,
      userAgent: request.get('user-agent')
    });
  });

  next();
};

