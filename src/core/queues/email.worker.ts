import { Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import { getRedisConnectionOptions } from '../config/redis.js';
import type { TransactionalEmailJob } from './email.queue.js';

const { host, port, secure, user, password, from } = config.mail;

if (!host || !user || !password || !from) {
  throw new Error(
    'SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM are required by email worker'
  );
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: {
    user,
    pass: password
  }
});

const worker = new Worker<TransactionalEmailJob>(
  'transactional-emails',
  async (job) => {
    if (job.data.type === 'ADMIN_TEST_EMAIL') {
      await transporter.sendMail({
        from,
        to: job.data.to,
        subject: `Test email ${job.data.platformName}`,
        text: [
          `Cet email confirme que les notifications de ${job.data.platformName}`,
          'sont correctement configurées.'
        ].join(' ')
      });
      return;
    }

    const isRegistration = job.data.type === 'REGISTRATION_OTP';
    const subject = isRegistration
      ? 'Code de validation de votre compte TTK'
      : 'Code de réinitialisation de votre mot de passe TTK';

    await transporter.sendMail({
      from,
      to: job.data.to,
      subject,
      text: [
        `Bonjour ${job.data.name},`,
        '',
        `Votre code OTP est : ${job.data.otp}`,
        `Il expire dans ${job.data.expiresInMinutes} minutes.`,
        '',
        "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message."
      ].join('\n')
    });
  },
  {
    connection: getRedisConnectionOptions(),
    concurrency: 5
  }
);

worker.on('completed', (job) => {
  console.info(`Email job completed: ${job.id}`);
});

worker.on('failed', (job, error) => {
  console.error(`Email job failed: ${job?.id}`, error);
});

async function shutdown(): Promise<void> {
  await worker.close();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

console.info('Transactional email worker started');
