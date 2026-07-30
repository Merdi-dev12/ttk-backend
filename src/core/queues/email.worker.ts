import { Worker } from 'bullmq';
import { config } from '../config/env.js';
import { getRedisConnectionOptions } from '../config/redis.js';
import {
  mailBrand,
  sendTransactionalEmail,
  verifyMailTransport
} from '../email/mailer.js';
import {
  renderContactNotificationEmail,
  renderContactReceiptEmail
} from '../email/contactTemplates.js';
import {
  renderOtpEmail,
  renderTestEmail
} from '../email/templates.js';
import { renderOrderPaymentLinkEmail } from '../email/orderTemplates.js';
import { logger } from '../utils/logger.js';
import type { TransactionalEmailJob } from './email.queue.js';

const provider = await verifyMailTransport();
logger.info('email_provider_ready', { provider });

const worker = new Worker<TransactionalEmailJob>(
  'transactional-emails',
  async (job) => {
    if (job.data.type === 'ADMIN_TEST_EMAIL') {
      const email = renderTestEmail(mailBrand, job.data.platformName);
      await sendTransactionalEmail({
        to: job.data.to,
        tags: [{ name: 'category', value: 'admin_test_email' }],
        ...email
      });
      return;
    }

    if (job.data.type === 'CONTACT_MESSAGE') {
      const contactEmail = mailBrand.contactEmail;
      if (!contactEmail) {
        throw new Error('CONTACT_TO_EMAIL or MAIL_SUPPORT_EMAIL is required');
      }
      const adminNotificationEmail =
        config.resend.notificationToEmail ?? config.mail.adminEmail ?? contactEmail;

      const notification = renderContactNotificationEmail(mailBrand, job.data);
      await sendTransactionalEmail({
        to: adminNotificationEmail,
        replyTo: {
          name: job.data.name,
          address: job.data.email
        },
        tags: [{ name: 'category', value: 'contact_notification' }],
        ...notification
      });

      const receipt = renderContactReceiptEmail(mailBrand, job.data);
      await sendTransactionalEmail({
        to: job.data.email,
        replyTo: contactEmail,
        tags: [{ name: 'category', value: 'contact_receipt' }],
        ...receipt
      });
      return;
    }

    if (job.data.type === 'ORDER_PAYMENT_LINK') {
      const email = renderOrderPaymentLinkEmail(mailBrand, job.data);
      await sendTransactionalEmail({
        to: job.data.to,
        replyTo: mailBrand.contactEmail,
        tags: [{ name: 'category', value: 'order_payment_link' }],
        ...email
      });
      return;
    }

    const isRegistration = job.data.type === 'REGISTRATION_OTP';
    const email = renderOtpEmail(mailBrand, {
      purpose: isRegistration ? 'REGISTRATION' : 'PASSWORD_RESET',
      name: job.data.name,
      otp: job.data.otp,
      expiresInMinutes: job.data.expiresInMinutes
    });
    await sendTransactionalEmail({
      to: job.data.to,
      tags: [{
        name: 'category',
        value: isRegistration ? 'registration_otp' : 'password_reset_otp'
      }],
      ...email
    });
  },
  {
    connection: getRedisConnectionOptions(),
    concurrency: 5
  }
);

worker.on('completed', (job) => {
  logger.info('email_job_completed', { jobId: job.id, jobType: job.data.type });
});

worker.on('failed', (job, error) => {
  logger.error('email_job_failed', {
    jobId: job?.id,
    jobType: job?.data.type,
    error
  });
});

async function shutdown(): Promise<void> {
  await worker.close();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

logger.info('transactional_email_worker_started');
