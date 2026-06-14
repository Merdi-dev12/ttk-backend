import { Queue } from 'bullmq';
import { getRedisConnectionOptions } from '../config/redis.js';

export interface OtpEmailJob {
  type: 'REGISTRATION_OTP' | 'PASSWORD_RESET_OTP';
  to: string;
  name: string;
  otp: string;
  expiresInMinutes: number;
}

type EmailQueue = Queue<
  OtpEmailJob,
  void,
  string,
  OtpEmailJob,
  void,
  string
>;

let emailQueue: EmailQueue | undefined;

function getEmailQueue(): EmailQueue {
  emailQueue ??= new Queue<
    OtpEmailJob,
    void,
    string,
    OtpEmailJob,
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
