import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config/env.js';
import { AppError } from '../utils/appError.js';

export interface ResendEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  html?: string | null;
  text?: string | null;
  headers?: Record<string, string>;
  message_id?: string;
}

export interface ResendReceivedEmailEvent {
  type: 'email.received';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    message_id?: string;
  };
}

interface ResendSendEmailInput {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  reply_to?: string[];
  headers?: Record<string, string>;
  tags?: Array<{ name: string; value: string }>;
}

function requireResendApiKey(): string {
  if (!config.resend.apiKey) {
    throw new AppError(
      503,
      'RESEND_API_KEY doit etre configure pour utiliser Resend',
      'RESEND_NOT_CONFIGURED'
    );
  }

  return config.resend.apiKey;
}

function normalizeSecret(secret: string): Buffer {
  const value = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
  return Buffer.from(value, 'base64');
}

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function hasValidSignature(
  expectedSignature: Buffer,
  signatureHeader: string
): boolean {
  return signatureHeader.split(' ').some((entry) => {
    const [, signature] = entry.split(',');
    if (!signature) {
      return false;
    }

    const receivedSignature = Buffer.from(signature, 'base64');
    return (
      receivedSignature.length === expectedSignature.length &&
      timingSafeEqual(receivedSignature, expectedSignature)
    );
  });
}

export function verifyResendWebhook(
  rawBody: Buffer | undefined,
  headers: {
    'svix-id'?: string | string[];
    'svix-timestamp'?: string | string[];
    'svix-signature'?: string | string[];
  }
): ResendReceivedEmailEvent {
  if (!config.resend.webhookSecret) {
    throw new AppError(
      503,
      'RESEND_WEBHOOK_SECRET doit etre configure',
      'RESEND_WEBHOOK_NOT_CONFIGURED'
    );
  }

  if (!rawBody) {
    throw new AppError(400, 'Body brut du webhook indisponible', 'WEBHOOK_RAW_BODY_REQUIRED');
  }

  const svixId = getHeaderValue(headers['svix-id']);
  const svixTimestamp = getHeaderValue(headers['svix-timestamp']);
  const svixSignature = getHeaderValue(headers['svix-signature']);

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new AppError(401, 'Signature webhook Resend absente', 'INVALID_WEBHOOK_SIGNATURE');
  }

  const timestamp = Number(svixTimestamp);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > 5 * 60) {
    throw new AppError(401, 'Signature webhook Resend expiree', 'INVALID_WEBHOOK_SIGNATURE');
  }

  const signedContent = `${svixId}.${svixTimestamp}.${rawBody.toString('utf8')}`;
  const expectedSignature = createHmac('sha256', normalizeSecret(config.resend.webhookSecret))
    .update(signedContent)
    .digest();

  if (!hasValidSignature(expectedSignature, svixSignature)) {
    throw new AppError(401, 'Signature webhook Resend invalide', 'INVALID_WEBHOOK_SIGNATURE');
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody.toString('utf8')) as unknown;
  } catch {
    throw new AppError(400, 'Payload webhook Resend invalide', 'INVALID_WEBHOOK_PAYLOAD');
  }

  if (
    !event ||
    typeof event !== 'object' ||
    !('type' in event) ||
    event.type !== 'email.received'
  ) {
    throw new AppError(202, 'Evenement webhook ignore', 'WEBHOOK_EVENT_IGNORED');
  }

  return event as ResendReceivedEmailEvent;
}

export async function retrieveReceivedEmail(emailId: string): Promise<ResendEmail> {
  const response = await fetch(
    `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`,
    {
      headers: {
        Authorization: `Bearer ${requireResendApiKey()}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Resend received email retrieval failed with ${response.status}`);
  }

  return (await response.json()) as ResendEmail;
}

export async function sendResendEmail(input: ResendSendEmailInput): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requireResendApiKey()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error(`Resend email send failed with ${response.status}`);
  }
}
