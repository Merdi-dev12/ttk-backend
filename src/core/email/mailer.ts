import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import { sendResendEmail } from './resend.js';

const { host, port, secure, user, password, from, fromName } = config.mail;
const smtpConfigured = Boolean(host && user && password && from);
const resendConfigured = Boolean(config.resend.apiKey && config.resend.fromEmail);

export const mailBrand = {
  name: config.mail.brandName,
  logoUrl: config.mail.logoUrl,
  frontendUrl: config.frontendUrl,
  supportEmail: config.mail.supportEmail,
  contactEmail: config.mail.contactEmail
};

export const mailFrom = {
  name: fromName,
  address: from ?? config.resend.fromEmail
};

export const mailTransporter = smtpConfigured
  ? nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass: password }
    })
  : undefined;

type EmailAddress = string | { name?: string; address: string };

interface SendTransactionalEmailInput {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: EmailAddress;
  tags?: Array<{ name: string; value: string }>;
}

function formatAddress(address: EmailAddress): string {
  if (typeof address === 'string') {
    return address;
  }

  return address.name
    ? `${address.name} <${address.address}>`
    : address.address;
}

function buildResendFrom(): string {
  return `${fromName} <${config.resend.fromEmail}>`;
}

export async function verifyMailTransport(): Promise<'resend' | 'smtp'> {
  if (resendConfigured) {
    return 'resend';
  }

  if (mailTransporter) {
    await mailTransporter.verify();
    return 'smtp';
  }

  throw new Error(
    'RESEND_API_KEY/RESEND_FROM_EMAIL or SMTP_HOST/SMTP_USER/SMTP_PASS/MAIL_FROM are required by email worker'
  );
}

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput
): Promise<void> {
  const to = Array.isArray(input.to) ? input.to : [input.to];

  if (resendConfigured) {
    await sendResendEmail({
      from: buildResendFrom(),
      to,
      reply_to: input.replyTo ? [formatAddress(input.replyTo)] : undefined,
      subject: input.subject,
      text: input.text,
      html: input.html,
      tags: input.tags
    });
    return;
  }

  if (!mailTransporter) {
    throw new Error('No transactional email provider is configured');
  }

  await mailTransporter.sendMail({
    from: from ? mailFrom : buildResendFrom(),
    to,
    replyTo: input.replyTo,
    subject: input.subject,
    text: input.text,
    html: input.html
  });
}
