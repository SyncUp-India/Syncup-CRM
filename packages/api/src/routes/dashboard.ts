import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';

const router = Router();
router.use(authenticate);

function getDateRange(filter: string) {
  const now = new Date();
  const from = new Date();
  if (filter === 'today') {
    from.setHours(0, 0, 0, 0);
  } else if (filter === 'week') {
    from.setDate(now.getDate() - 7);
  } else {
    // month
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  }
  return { from, to: now };
}

router.get('/stats', async (req: AuthRequest, res: Response) => {
  const { period = 'month', userId } = req.query as { period?: string; userId?: string };
  const { from, to } = getDateRange(period);

  // Determine scope
  let scopeFilter: Record<string, unknown> = {};
  if (req.user!.role === 'associate') {
    scopeFilter = { assignedToId: req.user!.id };
  } else if (userId) {
    scopeFilter = { assignedToId: userId };
  }

  const dateFilter = { createdAt: { gte: from, lte: to } };

  const [
    totalLeads,
    inbound, outbound, cold,
    dnp, callbackReq, followupReq, meetingBooked, onboarded,
    callsMade,
    followupsCompleted,
  ] = await Promise.all([
    prisma.lead.count({ where: { ...scopeFilter } }),
    prisma.lead.count({ where: { ...scopeFilter, leadType: 'inbound', ...dateFilter } }),
    prisma.lead.count({ where: { ...scopeFilter, leadType: 'outbound', ...dateFilter } }),
    prisma.lead.count({ where: { ...scopeFilter, leadType: 'cold', ...dateFilter } }),
    prisma.lead.count({ where: { ...scopeFilter, stage: 'DNP' } }),
    prisma.lead.count({ where: { ...scopeFilter, stage: 'callback_requested' } }),
    prisma.lead.count({ where: { ...scopeFilter, stage: 'followup_required' } }),
    prisma.lead.count({ where: { ...scopeFilter, stage: 'meeting_booked' } }),
    prisma.lead.count({ where: { ...scopeFilter, stage: 'lead_onboarded' } }),
    prisma.activity.count({
      where: {
        action: 'call_attempt',
        createdAt: { gte: from, lte: to },
        ...(scopeFilter.assignedToId ? { userId: scopeFilter.assignedToId as string } : {}),
      },
    }),
    prisma.followup.count({
      where: {
        completedAt: { not: null, gte: from, lte: to },
        ...(scopeFilter.assignedToId ? { userId: scopeFilter.assignedToId as string } : {}),
      },
    }),
  ]);

  const conversionRate = totalLeads > 0 ? Math.round((onboarded / totalLeads) * 100) : 0;

  res.json({
    success: true,
    data: {
      totalLeads,
      byType: { inbound, outbound, cold },
      byStage: {
        DNP: dnp,
        callback_requested: callbackReq,
        followup_required: followupReq,
        meeting_booked: meetingBooked,
        lead_onboarded: onboarded,
      },
      callsMade,
      followupsCompleted,
      leadsOnboarded: onboarded,
      conversionRate,
    },
  });
});

router.get('/daily-activity', async (req: AuthRequest, res: Response) => {
  const { period = 'month', userId } = req.query as { period?: string; userId?: string };
  const { from } = getDateRange(period);

  const userFilter = req.user!.role === 'associate'
    ? { userId: req.user!.id }
    : userId ? { userId } : {};

  const activities = await prisma.activity.findMany({
    where: {
      action: 'call_attempt',
      createdAt: { gte: from },
      ...userFilter,
    },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const leads = await prisma.lead.findMany({
    where: {
      createdAt: { gte: from },
      ...(req.user!.role === 'associate' ? { assignedToId: req.user!.id } : {}),
      ...(userId ? { assignedToId: userId } : {}),
    },
    select: { createdAt: true },
  });

  const dailyMap: Record<string, { calls: number; leads: number }> = {};

  activities.forEach((a: { createdAt: Date }) => {
    const date = a.createdAt.toISOString().split('T')[0];
    if (!dailyMap[date]) dailyMap[date] = { calls: 0, leads: 0 };
    dailyMap[date].calls += 1;
  });

  leads.forEach((l: { createdAt: Date }) => {
    const date = l.createdAt.toISOString().split('T')[0];
    if (!dailyMap[date]) dailyMap[date] = { calls: 0, leads: 0 };
    dailyMap[date].leads += 1;
  });

  const result = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));

  res.json({ success: true, data: result });
});

router.get('/user-performance', async (req: AuthRequest, res: Response) => {
  if (req.user!.role === 'associate') {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const { period = 'month' } = req.query as { period?: string };
  const { from, to } = getDateRange(period);

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const performance = await Promise.all(
    users.map(async (u: { id: string; name: string }) => {
      const [totalLeads, callsMade, onboarded] = await Promise.all([
        prisma.lead.count({ where: { assignedToId: u.id, createdAt: { gte: from, lte: to } } }),
        prisma.activity.count({ where: { userId: u.id, action: 'call_attempt', createdAt: { gte: from, lte: to } } }),
        prisma.lead.count({ where: { assignedToId: u.id, stage: 'lead_onboarded', updatedAt: { gte: from, lte: to } } }),
      ]);
      return { userId: u.id, userName: u.name, totalLeads, callsMade, onboarded };
    })
  );

  res.json({ success: true, data: performance });
});

export default router;
