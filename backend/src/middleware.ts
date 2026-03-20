import { Request, Response, NextFunction } from 'express';

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-authentik-uid'] as string | undefined;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  (req as any).userId = userId;
  next();
}
