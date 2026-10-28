import type { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import type { AuthUser, Pagination, TaskDto } from '../models';
import { taskRepository, type TaskWriteData } from '../repositories/task.repository';
import { parseDateOnly, todayUtc } from '../utils/dates';
import { HttpError } from '../utils/http-error';
import {
  EMPLOYEE_EDITABLE_TASK_FIELDS,
  adminUpdateTaskSchema,
  employeeUpdateTaskSchema,
  type CreateTaskInput,
  type ListTasksQuery,
} from '../validators/task.schemas';

/** Admin sees all tasks; an employee sees only tasks assigned to them. */
function visibleTasksWhere(user: AuthUser): Prisma.TaskWhereInput {
  return user.role === 'Admin' ? {} : { assignedToId: user.id };
}

/**
 * Loads a task and checks the user may access it.
 * 404 if it does not exist, 403 if it belongs to another employee.
 */
async function assertTaskAccess(user: AuthUser, taskId: number) {
  const task = await taskRepository.findAccessInfo(taskId);
  if (!task) throw HttpError.notFound('Task not found');
  if (user.role !== 'Admin' && task.assignedToId !== user.id) {
    throw HttpError.forbidden('You do not have access to this task');
  }
  return task;
}

/** The assignee must be an existing Employee and the project must exist. */
async function assertReferencesValid(refs: { assignedTo?: number; projectId?: number }) {
  const details: { field: string; message: string }[] = [];

  if (refs.assignedTo !== undefined) {
    const assignee = await prisma.user.findUnique({ where: { id: refs.assignedTo }, select: { role: true } });
    if (!assignee) details.push({ field: 'assignedTo', message: `User ${refs.assignedTo} does not exist` });
    else if (assignee.role !== 'Employee') {
      details.push({ field: 'assignedTo', message: 'Tasks can only be assigned to employees' });
    }
  }

  if (refs.projectId !== undefined) {
    const project = await prisma.project.findUnique({ where: { id: refs.projectId }, select: { id: true } });
    if (!project) details.push({ field: 'projectId', message: `Project ${refs.projectId} does not exist` });
  }

  if (details.length > 0) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid references', details);
  }
}

export const taskService = {
  async list(user: AuthUser, query: ListTasksQuery): Promise<{ items: TaskDto[]; pagination: Pagination }> {
    const today = todayUtc();
    const filters: Prisma.TaskWhereInput[] = [visibleTasksWhere(user)];

    if (query.search) filters.push({ title: { contains: query.search, mode: 'insensitive' } });
    if (query.status) filters.push({ status: query.status });
    if (query.priority) filters.push({ priority: query.priority });
    if (query.projectId) filters.push({ projectId: query.projectId });
    // Employees are already limited to their own tasks, so this filter only matters for admins.
    if (query.assignedTo && user.role === 'Admin') filters.push({ assignedToId: query.assignedTo });
    if (query.overdue === true) filters.push({ status: { not: 'Done' }, dueDate: { lt: today } });
    if (query.overdue === false) filters.push({ OR: [{ status: 'Done' }, { dueDate: { gte: today } }] });

    const { items, total } = await taskRepository.findPage({
      where: { AND: filters },
      // sortBy comes from a fixed allow-list (validated by Zod); id keeps the order stable.
      orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });

    return {
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  },

  async getById(user: AuthUser, id: number): Promise<TaskDto> {
    await assertTaskAccess(user, id);
    const task = await taskRepository.findById(id);
    if (!task) throw HttpError.notFound('Task not found');
    return task;
  },

  async create(user: AuthUser, input: CreateTaskInput): Promise<TaskDto> {
    await assertReferencesValid({ assignedTo: input.assignedTo, projectId: input.projectId });
    return taskRepository.create({
      title: input.title,
      description: input.description,
      assignedToId: input.assignedTo,
      projectId: input.projectId,
      priority: input.priority,
      status: input.status,
      dueDate: parseDateOnly(input.dueDate),
      createdById: user.id, // from the token, never from the request body
    });
  },

  /**
   * Admin: may change any editable field.
   * Employee: may change only "status", and only on a task assigned to them.
   */
  async update(user: AuthUser, id: number, body: unknown): Promise<TaskDto> {
    await assertTaskAccess(user, id);

    let data: TaskWriteData;

    if (user.role === 'Admin') {
      const input = adminUpdateTaskSchema.parse(body);
      await assertReferencesValid({ assignedTo: input.assignedTo, projectId: input.projectId });
      data = {
        title: input.title,
        description: input.description,
        assignedToId: input.assignedTo,
        projectId: input.projectId,
        priority: input.priority,
        status: input.status,
        dueDate: input.dueDate ? parseDateOnly(input.dueDate) : undefined,
      };
    } else {
      const sentFields = body && typeof body === 'object' ? Object.keys(body) : [];
      const forbidden = sentFields.filter(
        (field) => !(EMPLOYEE_EDITABLE_TASK_FIELDS as readonly string[]).includes(field),
      );
      if (forbidden.length > 0) {
        throw HttpError.forbidden(`Employees may only update: ${EMPLOYEE_EDITABLE_TASK_FIELDS.join(', ')}. Not allowed: ${forbidden.join(', ')}`);
      }
      const input = employeeUpdateTaskSchema.parse(body);
      data = { status: input.status };
    }

    return taskRepository.update(id, data);
  },

  async remove(id: number): Promise<void> {
    const task = await taskRepository.findAccessInfo(id);
    if (!task) throw HttpError.notFound('Task not found');
    await taskRepository.deleteWithComments(id);
  },

  /** Exposed for the comment service: same access rule as viewing the task. */
  assertTaskAccess,
};
