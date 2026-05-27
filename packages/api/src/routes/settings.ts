import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { LEAD_STAGES, STAGE_EMAIL_SUBJECT } from '@syncup/shared';

const router = Router();
router.use(authenticate);

// Get all email templates
router.get('/email-templates', async (_req: AuthRequest, res: Response) => {
  const templates = await prisma.emailTemplate.findMany({
    orderBy: { stage: 'asc' },
  });
  res.json({ success: true, data: templates });
});

// Update email template (super admin only)
router.put(
  '/email-templates/:stage',
  requireRole('super_admin'),
  [
    body('subject').notEmpty().trim(),
    body('body').notEmpty(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { stage } = req.params;
    if (!LEAD_STAGES.includes(stage as typeof LEAD_STAGES[number])) {
      return res.status(400).json({ success: false, error: 'Invalid stage' });
    }

    const template = await prisma.emailTemplate.upsert({
      where: { stage: stage as typeof LEAD_STAGES[number] },
      update: { subject: req.body.subject, body: req.body.body },
      create: { stage: stage as typeof LEAD_STAGES[number], subject: req.body.subject, body: req.body.body },
    });

    res.json({ success: true, data: template });
  }
);

// Get SMTP settings (super admin only)
router.get('/smtp', requireRole('super_admin'), async (_req: AuthRequest, res: Response) => {
  const settings = await prisma.setting.findMany({
    where: { key: { startsWith: 'smtp_' } },
  });
  const result: Record<string, string> = {};
  settings.forEach((s: { key: string; value: string }) => { result[s.key] = s.key === 'smtp_pass' ? '***' : s.value; });
  res.json({ success: true, data: result });
});

// Update SMTP settings (super admin only)
router.put('/smtp', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { host, port, user, pass, from } = req.body;

  const updates: Array<{ key: string; value: string }> = [];
  if (host) updates.push({ key: 'smtp_host', value: host });
  if (port) updates.push({ key: 'smtp_port', value: String(port) });
  if (user) updates.push({ key: 'smtp_user', value: user });
  if (pass) updates.push({ key: 'smtp_pass', value: pass });
  if (from) updates.push({ key: 'smtp_from', value: from });

  await Promise.all(
    updates.map((u) =>
      prisma.setting.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value },
      })
    )
  );

  res.json({ success: true, message: 'SMTP settings updated' });
});

// Seed default email templates
router.post('/email-templates/seed', requireRole('super_admin'), async (_req: AuthRequest, res: Response) => {
  const defaults: Array<{ stage: typeof LEAD_STAGES[number]; subject: string; body: string }> = [
    {
      stage: 'DNP',
      subject: STAGE_EMAIL_SUBJECT.DNP,
      body: `<p>Hi {{name}},</p><p>We tried reaching you today but couldn't get through. We'd love to connect with you about how we can help your business.</p><p>Please feel free to call us back at your convenience.</p><p>Best regards,<br/>The SyncUp Team</p>`,
    },
    {
      stage: 'callback_requested',
      subject: STAGE_EMAIL_SUBJECT.callback_requested,
      body: `<p>Hi {{name}},</p><p>Thank you for requesting a callback! We'll call you back at your preferred time shortly.</p><p>We're looking forward to speaking with you.</p><p>Best regards,<br/>The SyncUp Team</p>`,
    },
    {
      stage: 'followup_required',
      subject: STAGE_EMAIL_SUBJECT.followup_required,
      body: `<p>Hi {{name}},</p><p>It was great speaking with you recently. We're following up on our conversation and wanted to check if you have any questions or need any further information.</p><p>Best regards,<br/>The SyncUp Team</p>`,
    },
    {
      stage: 'meeting_booked',
      subject: STAGE_EMAIL_SUBJECT.meeting_booked,
      body: `<p>Hi {{name}},</p><p>Great news! Your meeting has been confirmed. We're excited to connect with you and discuss how we can help achieve your goals.</p><p>We'll be in touch with the meeting details shortly.</p><p>Best regards,<br/>The SyncUp Team</p>`,
    },
    {
      stage: 'lead_onboarded',
      subject: STAGE_EMAIL_SUBJECT.lead_onboarded,
      body: `<p>Hi {{name}},</p><p>Welcome aboard! We're thrilled to have you with us. Our team is ready to support you every step of the way.</p><p>If you have any questions, don't hesitate to reach out.</p><p>Best regards,<br/>The SyncUp Team</p>`,
    },
  ];

  for (const d of defaults) {
    await prisma.emailTemplate.upsert({
      where: { stage: d.stage },
      update: {},
      create: d,
    });
  }

  res.json({ success: true, message: 'Default templates seeded' });
});

export default router;
