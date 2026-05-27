import { Router, Response } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';

const router = Router();
router.use(authenticate, requireRole('super_admin', 'lead'));

router.get('/', async (req: AuthRequest, res: Response) => {
  const { entityType, entityId, userId, page = '1', limit = '25' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (userId) where.userId = userId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({
    success: true,
    data: logs,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

export default router;
