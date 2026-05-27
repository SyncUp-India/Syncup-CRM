import nodemailer from 'nodemailer';
import { LeadStage } from '@syncup/shared';
import { prisma } from '../utils/prisma';

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}

export async function sendStageEmail(
  leadEmail: string,
  leadName: string,
  stage: LeadStage
): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP not configured, skipping email');
    return;
  }
  if (!leadEmail) return;

  try {
    const template = await prisma.emailTemplate.findUnique({ where: { stage } });
    if (!template) return;

    const vars = { name: leadName, stage };
    const subject = interpolate(template.subject, vars);
    const html = interpolate(template.body, vars);

    const transporter = createTransport();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: leadEmail,
      subject,
      html,
    });
    console.log(`Email sent to ${leadEmail} for stage ${stage}`);
  } catch (err) {
    console.error('Email send error:', err);
  }
}

export async function sendRawEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
  try {
    const transporter = createTransport();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('Email send error:', err);
  }
}
