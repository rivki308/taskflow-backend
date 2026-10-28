import type { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import type { CommentDto, Role } from '../models';

const commentSelect = {
  id: true,
  taskId: true,
  content: true,
  createdAt: true,
  user: { select: { id: true, name: true, role: true } },
} satisfies Prisma.CommentSelect;

type CommentRow = Prisma.CommentGetPayload<{ select: typeof commentSelect }>;

function toCommentDto(row: CommentRow): CommentDto {
  return {
    id: row.id,
    taskId: row.taskId,
    content: row.content,
    user: { id: row.user.id, name: row.user.name, role: row.user.role as Role },
    createdAt: row.createdAt.toISOString(),
  };
}

export const commentRepository = {
  async findByTaskId(taskId: number): Promise<CommentDto[]> {
    const rows = await prisma.comment.findMany({
      where: { taskId },
      select: commentSelect,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toCommentDto);
  },

  async create(data: { taskId: number; userId: number; content: string }): Promise<CommentDto> {
    const row = await prisma.comment.create({ data, select: commentSelect });
    return toCommentDto(row);
  },
};
