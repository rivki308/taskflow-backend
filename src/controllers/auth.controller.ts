import type { Request, Response } from 'express';
import { currentUser } from '../middleware/authenticate';
import { authService } from '../services/auth.service';
import { loginSchema } from '../validators/auth.schemas';

export const authController = {
  async login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.status(200).json({ data: result });
  },

  async logout(req: Request, res: Response) {
    await authService.logout(currentUser(req).id);
    res.status(200).json({ data: { message: 'Logged out. The token is no longer valid' } });
  },

  async me(req: Request, res: Response) {
    const user = await authService.me(currentUser(req).id);
    res.status(200).json({ data: user });
  },
};
