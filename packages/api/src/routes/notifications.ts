import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.notification.count({ where: { userId: req.user!.id } }),
    prisma.notification.count({ where: { userId: req.user!.id, read: false } }),
  ]);

  res.json({
    success: true,
    data: notifications,
    total,
    unreadCount,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user!.id },
    data: { read: true },
  });
  res.json({ success: true });
});

router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, read: false },
    data: { read: true },
  });
  res.json({ success: true });
});

router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  const count = await prisma.notification.count({
    where: { userId: req.user!.id, read: false },
  });
  res.json({ success: true, data: { count } });
});

export default router;
