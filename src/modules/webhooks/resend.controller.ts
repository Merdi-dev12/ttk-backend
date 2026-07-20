import type { RequestHandler } from 'express';
import { config } from '../../core/config/env.js';
import { getRedisClient } from '../../core/config/redis.js';
import {
  retrieveReceivedEmail,
  sendResendEmail,
  verifyResendWebhook
} from '../../core/email/resend.js';
import { logger } from '../../core/utils/logger.js';
import { createAdminNotification } from '../admin/notifications.service.js';
import {
  renderInboundNotificationEmail,
  renderInboundReceiptEmail
} from './resendEmailTemplates.js';

function normalizeEmail(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

function buildFrom(): string {
  return `${config.mail.fromName} <${config.resend.fromEmail}>`;
}

function isContactRecipient(recipients: string[]): boolean {
  const expected = normalizeEmail(config.resend.inboundContactEmail);
  return recipients.some((recipient) => normalizeEmail(recipient) === expected);
}

async function acquireEmailProcessingLock(emailId: string): Promise<boolean> {
  const redis = getRedisClient();
  const result = await redis.set(
    `resend:email-received:${emailId}`,
    'processing',
    'EX',
    10 * 60,
    'NX'
  );
  return result === 'OK';
}

async function markEmailProcessed(emailId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.set(`resend:email-received:${emailId}`, 'done', 'EX', 60 * 60 * 24 * 7);
}

export const receiveEmail: RequestHandler = async (request, response) => {
  const event = verifyResendWebhook(request.rawBody, {
    'svix-id': request.headers['svix-id'],
    'svix-timestamp': request.headers['svix-timestamp'],
    'svix-signature': request.headers['svix-signature']
  });

  if (!isContactRecipient(event.data.to)) {
    response.status(200).json({ received: true, ignored: true });
    return;
  }

  if (!(await acquireEmailProcessingLock(event.data.email_id))) {
    response.status(200).json({ received: true, duplicate: true });
    return;
  }

  const receivedEmail = await retrieveReceivedEmail(event.data.email_id);
  await createAdminNotification({
    type: 'INBOUND_EMAIL',
    title: `Nouvel email de ${normalizeEmail(event.data.from)}`,
    message: receivedEmail.subject ?? event.data.subject ?? 'Message sans sujet',
    metadata: {
      emailId: event.data.email_id,
      from: receivedEmail.headers?.from ?? receivedEmail.from ?? event.data.from,
      to: receivedEmail.to ?? event.data.to,
      subject: receivedEmail.subject ?? event.data.subject,
      preview: (receivedEmail.text ?? '').slice(0, 500),
      source: 'resend_inbound'
    }
  });

  const brand = {
    name: config.mail.brandName,
    frontendUrl: config.frontendUrl,
    supportEmail: config.mail.supportEmail,
    contactEmail: config.resend.inboundContactEmail
  };

  const receipt = renderInboundReceiptEmail(brand, {
    subject: receivedEmail.subject ?? event.data.subject
  });

  await sendResendEmail({
    from: buildFrom(),
    to: [normalizeEmail(event.data.from)],
    reply_to: [config.resend.inboundContactEmail],
    headers: event.data.message_id
      ? { 'In-Reply-To': event.data.message_id, References: event.data.message_id }
      : undefined,
    tags: [{ name: 'category', value: 'contact_receipt' }],
    ...receipt
  });

  if (config.resend.notificationToEmail) {
    const notification = renderInboundNotificationEmail(brand, {
      from: receivedEmail.headers?.from ?? receivedEmail.from ?? event.data.from,
      to: receivedEmail.to ?? event.data.to,
      subject: receivedEmail.subject ?? event.data.subject,
      text: receivedEmail.text,
      html: receivedEmail.html
    });

    await sendResendEmail({
      from: buildFrom(),
      to: [config.resend.notificationToEmail],
      reply_to: [normalizeEmail(event.data.from)],
      tags: [{ name: 'category', value: 'contact_notification' }],
      ...notification
    });
  } else {
    logger.warn('resend_inbound_notification_skipped', {
      reason: 'RESEND_NOTIFICATION_TO_EMAIL is not configured',
      emailId: event.data.email_id
    });
  }

  await markEmailProcessed(event.data.email_id);

  response.status(200).json({ received: true });
};
