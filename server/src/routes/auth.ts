import { Router } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../db/prisma';
import {
  createSession,
  getSessionCookieOptions,
  hashPassword,
  normalizeEmail,
  revokeSession,
  SAFE_USER_SELECT,
  SESSION_COOKIE_NAME,
  verifyPassword,
} from '../services/authService';
import { requireAuth } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimit';

const router = Router();

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters.')
    .max(80, 'Full name must be 80 characters or fewer.'),
  email: z.string().trim().email('Please enter a valid email address.').max(120),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .max(100, 'Password must be 100 characters or fewer.'),
});

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters.')
    .max(80, 'Full name must be 80 characters or fewer.'),
});

router.post('/register', authRateLimiter, async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid registration data.',
      });
      return;
    }

    const email = normalizeEmail(parsed.data.email);
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      res.status(409).json({
        error: 'An account with this email address already exists. Please log in instead.',
      });
      return;
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash,
        role: UserRole.STUDENT,
      },
      select: SAFE_USER_SELECT,
    });

    const { rawToken } = await createSession(user.id);
    res.cookie(SESSION_COOKIE_NAME, rawToken, getSessionCookieOptions());

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid login credentials.',
      });
      return;
    }

    const email = normalizeEmail(parsed.data.email);
    const userRecord = await prisma.user.findUnique({
      where: { email },
    });

    if (!userRecord) {
      res.status(401).json({ error: 'Invalid email address or password.' });
      return;
    }

    const passwordMatches = await verifyPassword(parsed.data.password, userRecord.passwordHash);
    if (!passwordMatches) {
      res.status(401).json({ error: 'Invalid email address or password.' });
      return;
    }

    const { rawToken } = await createSession(userRecord.id);
    res.cookie(SESSION_COOKIE_NAME, rawToken, getSessionCookieOptions());

    res.status(200).json({
      user: {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role,
        createdAt: userRecord.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const rawToken = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    await revokeSession(rawToken);
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    res.status(200).json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.status(200).json({ user: req.user });
});

router.patch('/profile', requireAuth, async (req, res, next) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid profile update.',
      });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name: parsed.data.name },
      select: SAFE_USER_SELECT,
    });

    res.status(200).json({ user: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
