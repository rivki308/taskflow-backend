import type { AuthUser, CommentDto } from '../models';
import { commentRepository } from '../repositories/comment.repository';
import type { CreateCommentInput } from '../validators/comment.schemas';
import { taskService } from './task.service';

export const commentService = {
  async listForTask(user: AuthUser, taskId: number): Promise<CommentDto[]> {
    await taskService.assertTaskAccess(user, taskId);
    return commentRepository.findByTaskId(taskId);
  },

  async create(user: AuthUser, taskId: number, input: CreateCommentInput): Promise<CommentDto> {
    await taskService.assertTaskAccess(user, taskId);
    return commentRepository.create({
      taskId,
      userId: user.id, // from the token, never from the request body
      content: input.content,
    });
  },
};
