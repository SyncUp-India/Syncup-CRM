import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { sendStageEmail } from '../services/email';
import { notifyLeadAssigned, notifyMeetingBooked } from '../services/notifications';
import { logAudit } from '../utils/audit';
import { LeadStage, LeadType, FollowupNumber } from '@syncup/shared';
import { stringify } from 'csv-stringify/sync';

const router = Router();
router.use(authenticate);

function buildLeadWhere(user: AuthRequest['user'], filters: Record<string, string | undefined>) {
  const { search, stage, leadType, assignedToId, dateFrom, dateTo } = filters;
  const where: Record<string, unknown> = {};

  // Role-based scoping
  if (user!.role === 'associate') {
    where.assignedToId = user!.id;
  } else if (user!.role === 'lead') {
    where.OR = [
      { assignedToId: user!.id },
      {
        assignedTo: {
          // team members — for simplicity, lead sees all assigned leads
        },
      },
    ];
    // Lead role sees all leads in the system (simplified)
    delete where.OR;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (stage) where.stage = stage as LeadStage;
  if (leadType) where.leadType = leadType as LeadType;
  if (assignedToId && user!.role !== 'associate') where.assignedToId = assignedToId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo);
  }

  return where;
}

// List leads with search, filter, pagination
router.get('/', async (req: AuthRequest, res: Response) => {
  const { search, stage, leadType, assignedToId, dateFrom, dateTo, page = '1', limit = '25' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit) || 25);
  const skip = (pageNum - 1) * limitNum;

  const where = buildLeadWhere(req.user, { search, stage, leadType, assignedToId, dateFrom, dateTo });

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: [
        // Prioritize leads with upcoming followups
        { updatedAt: 'desc' },
      ],
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        followups: {
          where: { completedAt: null },
          orderBy: { scheduledAt: 'asc' },
          take: 1,
        },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  res.json({
    success: true,
    data: leads,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

// Export leads as CSV (super admin only)
router.get('/export', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { search, stage, leadType, assignedToId, dateFrom, dateTo } = req.query as Record<string, string>;
  const where = buildLeadWhere(req.user, { search, stage, leadType, assignedToId, dateFrom, dateTo });

  const leads = await prisma.lead.findMany({
    where,
    include: { assignedTo: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const rows = leads.map((l: typeof leads[0]) => ({
    Name: l.name,
    Designation: l.designation || '',
    Company: l.company,
    Phone: l.phone,
    Email: l.email || '',
    'Lead Type': l.leadType,
    Stage: l.stage,
    'Assigned To': l.assignedTo?.name || '',
    Source: l.source,
    'Created At': l.createdAt.toISOString(),
  }));

  const csv = stringify(rows, { header: true });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
  res.send(csv);
});

// Get single lead with full activity timeline
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      activities: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      followups: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

  // Associates can only view their own leads
  if (req.user!.role === 'associate' && lead.assignedToId !== req.user!.id) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  res.json({ success: true, data: lead });
});

// Create lead
router.post(
  '/',
  [
    body('name').notEmpty().trim(),
    body('company').notEmpty().trim(),
    body('phone').notEmpty().trim(),
    body('leadType').optional().isIn(['inbound', 'outbound', 'cold']),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { name, designation, company, phone, email, leadType, assignedToId, source } = req.body;

    const lead = await prisma.lead.create({
      data: {
        name,
        designation,
        company,
        phone,
        email,
        leadType: leadType || 'cold',
        assignedToId: assignedToId || req.user!.id,
        source: source || 'manual',
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    await prisma.activity.create({
      data: {
        leadId: lead.id,
        userId: req.user!.id,
        action: 'lead_created',
        details: `Lead created by ${req.user!.name}`,
      },
    });

    if (assignedToId && assignedToId !== req.user!.id) {
      await notifyLeadAssigned(assignedToId, lead.id, lead.name);
    }

    await logAudit(req.user!.id, 'Lead', lead.id, 'create', undefined, req.body);
    res.status(201).json({ success: true, data: lead });
  }
);

// Update lead (general fields)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ success: false, error: 'Lead not found' });

  if (req.user!.role === 'associate' && existing.assignedToId !== req.user!.id) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const { name, designation, company, phone, email, leadType, assignedToId, source } = req.body;
  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name;
  if (designation !== undefined) updateData.designation = designation;
  if (company) updateData.company = company;
  if (phone) updateData.phone = phone;
  if (email !== undefined) updateData.email = email;
  if (leadType) updateData.leadType = leadType;
  if (assignedToId !== undefined && req.user!.role !== 'associate') {
    updateData.assignedToId = assignedToId;
  }
  if (source) updateData.source = source;

  const lead = await prisma.lead.update({
    where: { id: req.params.id },
    data: updateData as never,
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  await prisma.activity.create({
    data: {
      leadId: lead.id,
      userId: req.user!.id,
      action: 'field_updated',
      details: `Lead details updated by ${req.user!.name}`,
      metadata: { changes: Object.keys(updateData) } as never,
    },
  });

  if (assignedToId && assignedToId !== existing.assignedToId) {
    await notifyLeadAssigned(assignedToId, lead.id, lead.name);
    await prisma.activity.create({
      data: {
        leadId: lead.id,
        userId: req.user!.id,
        action: 'lead_assigned',
        details: `Lead assigned to new user`,
      },
    });
  }

  await logAudit(req.user!.id, 'Lead', lead.id, 'update', existing as unknown as Record<string, unknown>, updateData);
  res.json({ success: true, data: lead });
});

// Change lead stage
router.patch('/:id/stage', [
  body('stage').isIn(['DNP', 'callback_requested', 'followup_required', 'meeting_booked', 'lead_onboarded']),
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }

  const existing = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ success: false, error: 'Lead not found' });

  if (req.user!.role === 'associate' && existing.assignedToId !== req.user!.id) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const { stage } = req.body as { stage: LeadStage };
  const lead = await prisma.lead.update({
    where: { id: req.params.id },
    data: { stage },
  });

  await prisma.activity.create({
    data: {
      leadId: lead.id,
      userId: req.user!.id,
      action: 'stage_changed',
      details: `Stage changed from ${existing.stage} to ${stage} by ${req.user!.name}`,
      metadata: { from: existing.stage, to: stage } as never,
    },
  });

  // Send automated email
  if (lead.email) {
    sendStageEmail(lead.email, lead.name, stage).then(() => {
      prisma.activity.create({
        data: {
          leadId: lead.id,
          userId: req.user!.id,
          action: 'email_sent',
          details: `Automated email sent for stage: ${stage}`,
        },
      }).catch(console.error);
    }).catch(console.error);
  }

  // Send meeting booked notification
  if (stage === 'meeting_booked' && lead.assignedToId) {
    notifyMeetingBooked(lead.assignedToId, lead.id, lead.name).catch(console.error);
  }

  await logAudit(req.user!.id, 'Lead', lead.id, 'stage_change',
    { stage: existing.stage },
    { stage }
  );

  res.json({ success: true, data: lead });
});

// Add note to lead
router.post('/:id/notes', [
  body('note').notEmpty().trim(),
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }

  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

  if (req.user!.role === 'associate' && lead.assignedToId !== req.user!.id) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const activity = await prisma.activity.create({
    data: {
      leadId: req.params.id,
      userId: req.user!.id,
      action: 'note_added',
      details: req.body.note,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  res.status(201).json({ success: true, data: activity });
});

// Log call attempt
router.post('/:id/call', async (req: AuthRequest, res: Response) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

  if (req.user!.role === 'associate' && lead.assignedToId !== req.user!.id) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const activity = await prisma.activity.create({
    data: {
      leadId: req.params.id,
      userId: req.user!.id,
      action: 'call_attempt',
      details: `Call attempted by ${req.user!.name}`,
      metadata: { phone: lead.phone } as never,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  res.status(201).json({ success: true, data: activity });
});

// Schedule followup
router.post('/:id/followups', [
  body('followupNumber').isIn(['followup_1', 'followup_2', 'followup_3']),
  body('scheduledAt').isISO8601(),
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }

  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

  if (req.user!.role === 'associate' && lead.assignedToId !== req.user!.id) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const { followupNumber, scheduledAt, notes } = req.body as {
    followupNumber: FollowupNumber;
    scheduledAt: string;
    notes?: string;
  };

  // Check if this followup number already exists
  const existing = await prisma.followup.findFirst({
    where: { leadId: req.params.id, followupNumber },
  });
  if (existing) {
    return res.status(400).json({ success: false, error: `${followupNumber} already scheduled` });
  }

  const followup = await prisma.followup.create({
    data: {
      leadId: req.params.id,
      userId: req.user!.id,
      followupNumber,
      scheduledAt: new Date(scheduledAt),
      notes,
    },
  });

  await prisma.activity.create({
    data: {
      leadId: req.params.id,
      userId: req.user!.id,
      action: 'followup_scheduled',
      details: `${followupNumber.replace('_', ' ')} scheduled for ${new Date(scheduledAt).toLocaleString()}`,
      metadata: { followupNumber, scheduledAt } as never,
    },
  });

  // Make sure lead is in followup_required stage
  if (lead.stage !== 'followup_required') {
    await prisma.lead.update({ where: { id: req.params.id }, data: { stage: 'followup_required' } });
  }

  res.status(201).json({ success: true, data: followup });
});

// Complete followup
router.patch('/:id/followups/:followupId/complete', async (req: AuthRequest, res: Response) => {
  const followup = await prisma.followup.findUnique({ where: { id: req.params.followupId } });
  if (!followup || followup.leadId !== req.params.id) {
    return res.status(404).json({ success: false, error: 'Followup not found' });
  }

  const updated = await prisma.followup.update({
    where: { id: req.params.followupId },
    data: { completedAt: new Date(), notes: req.body.notes || followup.notes },
  });

  await prisma.activity.create({
    data: {
      leadId: req.params.id,
      userId: req.user!.id,
      action: 'followup_completed',
      details: `${followup.followupNumber.replace('_', ' ')} completed by ${req.user!.name}`,
    },
  });

  res.json({ success: true, data: updated });
});

// Delete lead (super admin only)
router.delete('/:id', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const leadId = req.params.id as string;
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

  await prisma.lead.delete({ where: { id: leadId } });
  await logAudit(req.user!.id, 'Lead', leadId, 'delete', lead as unknown as Record<string, unknown>);
  res.json({ success: true, message: 'Lead deleted' });
});

export default router;
