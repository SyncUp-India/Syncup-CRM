import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/audit';

const router = Router();
router.use(authenticate);

// Super admin: list all users
router.get('/', requireRole('super_admin', 'lead'), async (req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: users });
});

// Super admin: create user
router.post(
  '/',
  requireRole('super_admin'),
  [
    body('name').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['super_admin', 'lead', 'associate']),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { name, email, password, role } = req.body;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    await logAudit(req.user!.id, 'User', user.id, 'create', undefined, { name, email, role });
    res.status(201).json({ success: true, data: user });
  }
);

// Super admin: update user
router.put(
  '/:id',
  requireRole('super_admin'),
  async (req: AuthRequest, res: Response) => {
    const { name, email, role, isActive, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (password) updateData.password = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData as never,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    await logAudit(req.user!.id, 'User', user.id, 'update',
      { name: existing.name, role: existing.role, isActive: existing.isActive },
      updateData
    );
    res.json({ success: true, data: user });
  }
);

// Super admin: delete (deactivate) user
router.delete('/:id', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const userId = req.params.id as string;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });

  await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
  await logAudit(req.user!.id, 'User', userId, 'deactivate');
  res.json({ success: true, message: 'User deactivated' });
});

export default router;
