import type { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import type { TaskDto, TaskPriority, TaskStatus } from '../models';
import { formatDateOnly, todayUtc } from '../utils/dates';

const taskSelect = {
  id: true,
  title: true,
  description: true,
  priority: true,
  status: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
  _count: { select: { comments: true } },
} satisfies Prisma.TaskSelect;

type TaskRow = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;

function toTaskDto(row: TaskRow): TaskDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority as TaskPriority,
    status: row.status as TaskStatus,
    dueDate: formatDateOnly(row.dueDate),
    isOverdue: row.status !== 'Done' && row.dueDate < todayUtc(),
    assignedTo: row.assignedTo,
    createdBy: row.createdBy,
    project: row.project,
    commentCount: row._count.comments,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export interface TaskWriteData {
  title?: string;
  description?: string | null;
  assignedToId?: number;
  projectId?: number;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: Date;
}

export const taskRepository = {
  /** One page of tasks plus the total count, in a single DB transaction. */
  async findPage(params: {
    where: Prisma.TaskWhereInput;
    orderBy: Prisma.TaskOrderByWithRelationInput[];
    skip: number;
    take: number;
  }): Promise<{ items: TaskDto[]; total: number }> {
    const [rows, total] = await prisma.$transaction([
      prisma.task.findMany({
        where: params.where,
        orderBy: params.orderBy,
        skip: params.skip,
        take: params.take,
        select: taskSelect,
      }),
      prisma.task.count({ where: params.where }),
    ]);
    return { items: rows.map(toTaskDto), total };
  },

  async findById(id: number): Promise<TaskDto | null> {
    const row = await prisma.task.findUnique({ where: { id }, select: taskSelect });
    return row ? toTaskDto(row) : null;
  },

  /** Minimal data for permission checks (who is the task assigned to?). */
  findAccessInfo(id: number) {
    return prisma.task.findUnique({ where: { id }, select: { id: true, assignedToId: true } });
  },

  async create(data: Required<Omit<TaskWriteData, 'description' | 'status'>> & TaskWriteData & { createdById: number }) {
    const row = await prisma.task.create({ data, select: taskSelect });
    return toTaskDto(row);
  },

  async update(id: number, data: TaskWriteData): Promise<TaskDto> {
    const row = await prisma.task.update({ where: { id }, data, select: taskSelect });
    return toTaskDto(row);
  },

  /** Deletes the task's comments and the task together — all or nothing. */
  async deleteWithComments(id: number): Promise<void> {
    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { taskId: id } }),
      prisma.task.delete({ where: { id } }),
    ]);
  },

  count(where: Prisma.TaskWhereInput): Promise<number> {
    return prisma.task.count({ where });
  },

  groupByStatus(where: Prisma.TaskWhereInput) {
    return prisma.task.groupBy({ by: ['status'], where, _count: { _all: true } });
  },
};
