import type { Request, Response } from 'express';
import { currentUser } from '../middleware/authenticate';
import { dashboardService } from '../services/dashboard.service';

export const dashboardController = {
  async summary(req: Request, res: Response) {
    const summary = await dashboardService.summary(currentUser(req));
    res.status(200).json({ data: summary });
  },
};
