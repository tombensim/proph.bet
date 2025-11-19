import { Resend } from 'resend';

if (!process.env.RESEND) {
  throw new Error('Missing RESEND environment variable');
}

export const resend = new Resend(process.env.RESEND);

