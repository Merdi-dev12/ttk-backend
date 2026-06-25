import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

const { host, port, secure, user, password, from, fromName } = config.mail;

if (!host || !user || !password || !from) {
  throw new Error(
    'SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM are required by email worker'
  );
}

export const mailBrand = {
  name: config.mail.brandName,
  logoUrl: config.mail.logoUrl,
  frontendUrl: config.frontendUrl,
  supportEmail: config.mail.supportEmail
};

export const mailFrom = {
  name: fromName,
  address: from
};

export const mailTransporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass: password }
});

export async function verifyMailTransport(): Promise<void> {
  await mailTransporter.verify();
}
