import type { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { createUserSchema, listUsersQuerySchema } from '../validators/user.schemas';

export const userController = {
  async list(req: Request, res: Response) {
    const query = listUsersQuerySchema.parse(req.query);
    const users = await userService.list(query);
    res.status(200).json({ data: users });
  },

  async create(req: Request, res: Response) {
    const input = createUserSchema.parse(req.body);
    const user = await userService.create(input);
    res.status(201).json({ data: user });
  },
};
