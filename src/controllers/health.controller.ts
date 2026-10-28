import type { Request, Response } from 'express';
import { prisma } from '../database/prisma';

export const healthController = {
  /** Used by Render's health check. Reveals no secrets — only "ok" / "error". */
  async check(_req: Request, res: Response) {
    let database: 'ok' | 'error' = 'ok';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'error';
    }
    const ok = database === 'ok';
    res.status(ok ? 200 : 503).json({
      status: ok ? 'ok' : 'error',
      database,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  },
};
