import type { Request, Response } from 'express';
import { currentUser } from '../middleware/authenticate';
import { taskService } from '../services/task.service';
import { idParamSchema } from '../validators/common.schemas';
import { createTaskSchema, listTasksQuerySchema } from '../validators/task.schemas';

export const taskController = {
  async list(req: Request, res: Response) {
    const query = listTasksQuerySchema.parse(req.query);
    const { items, pagination } = await taskService.list(currentUser(req), query);
    res.status(200).json({ data: items, pagination });
  },

  async getById(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const task = await taskService.getById(currentUser(req), id);
    res.status(200).json({ data: task });
  },

  async create(req: Request, res: Response) {
    const input = createTaskSchema.parse(req.body);
    const task = await taskService.create(currentUser(req), input);
    res.status(201).json({ data: task });
  },

  /** The allowed fields depend on the role, so the service validates the body. */
  async update(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const task = await taskService.update(currentUser(req), id, req.body);
    res.status(200).json({ data: task });
  },

  async remove(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    await taskService.remove(id);
    res.status(204).send();
  },
};
