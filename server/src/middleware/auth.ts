import { Request, Response, NextFunction } from 'express';
import { SafeUser, SESSION_COOKIE_NAME, validateSession } from '../services/authService';

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    const user = await validateSession(rawToken);

    if (!user) {
      res.status(401).json({ error: 'Authentication required. Please log in.' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
