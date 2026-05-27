import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email, isActive: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const jwtOptions: SignOptions = { expiresIn: 60 * 60 * 24 * 7 }; // 7 days
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET!,
      jwtOptions
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  }
);

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  res.json({ success: true, data: user });
});

router.put('/me/push-token', authenticate, async (req: AuthRequest, res: Response) => {
  const { pushToken } = req.body;
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { pushToken },
  });
  res.json({ success: true });
});

router.put('/me/password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }

  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(400).json({ success: false, error: 'Current password is incorrect' });
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: req.user!.id }, data: { password: hashed } });
  res.json({ success: true, message: 'Password updated' });
});

export default router;
