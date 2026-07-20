import { Queue } from 'bullmq';
import { getRedisConnectionOptions } from '../config/redis.js';

export interface OtpEmailJob {
  type: 'REGISTRATION_OTP' | 'PASSWORD_RESET_OTP';
  to: string;
  name: string;
  otp: string;
  expiresInMinutes: number;
}

export interface TestEmailJob {
  type: 'ADMIN_TEST_EMAIL';
  to: string;
  platformName: string;
}

export interface ContactEmailJob {
  type: 'CONTACT_MESSAGE';
  name: string;
  email: string;
  subject: string;
  message: string;
}

export type TransactionalEmailJob = OtpEmailJob | TestEmailJob | ContactEmailJob;

type EmailQueue = Queue<
  TransactionalEmailJob,
  void,
  string,
  TransactionalEmailJob,
  void,
  string
>;

let emailQueue: EmailQueue | undefined;

function getEmailQueue(): EmailQueue {
  emailQueue ??= new Queue<
    TransactionalEmailJob,
    void,
    string,
    TransactionalEmailJob,
    void,
    string
  >('transactional-emails', {
    connection: getRedisConnectionOptions(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5_000
      },
      removeOnComplete: 100,
      removeOnFail: 500
    }
  });

  return emailQueue;
}

export async function enqueueOtpEmail(data: OtpEmailJob): Promise<void> {
  await getEmailQueue().add(data.type, data);
}

export async function enqueueTestEmail(data: TestEmailJob): Promise<void> {
  await getEmailQueue().add(data.type, data);
}

export async function enqueueContactEmail(data: ContactEmailJob): Promise<void> {
  await getEmailQueue().add(data.type, data);
}
