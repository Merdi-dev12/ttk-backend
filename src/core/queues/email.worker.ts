import { Worker } from 'bullmq';
import { getRedisConnectionOptions } from '../config/redis.js';
import {
  mailBrand,
  mailFrom,
  mailTransporter,
  verifyMailTransport
} from '../email/mailer.js';
import {
  renderOtpEmail,
  renderTestEmail
} from '../email/templates.js';
import { logger } from '../utils/logger.js';
import type { TransactionalEmailJob } from './email.queue.js';

await verifyMailTransport();
logger.info('smtp_connection_verified');

const worker = new Worker<TransactionalEmailJob>(
  'transactional-emails',
  async (job) => {
    if (job.data.type === 'ADMIN_TEST_EMAIL') {
      const email = renderTestEmail(mailBrand, job.data.platformName);
      await mailTransporter.sendMail({
        from: mailFrom,
        to: job.data.to,
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
    await mailTransporter.sendMail({
      from: mailFrom,
      to: job.data.to,
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
