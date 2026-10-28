import type { Request, Response } from 'express';
import { currentUser } from '../middleware/authenticate';
import { commentService } from '../services/comment.service';
import { createCommentSchema } from '../validators/comment.schemas';
import { idParamSchema } from '../validators/common.schemas';

export const commentController = {
  async list(req: Request, res: Response) {
    const { id: taskId } = idParamSchema.parse(req.params);
    const comments = await commentService.listForTask(currentUser(req), taskId);
    res.status(200).json({ data: comments });
  },

  async create(req: Request, res: Response) {
    const { id: taskId } = idParamSchema.parse(req.params);
    const input = createCommentSchema.parse(req.body);
    const comment = await commentService.create(currentUser(req), taskId, input);
    res.status(201).json({ data: comment });
  },
};
