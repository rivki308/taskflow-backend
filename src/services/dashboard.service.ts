import type { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import type { AuthUser, TaskStatus } from '../models';
import { taskRepository } from '../repositories/task.repository';
import { todayUtc } from '../utils/dates';

export interface DashboardSummary {
  scope: 'all' | 'mine';
  tasks: {
    total: number;
    open: number;
    overdue: number;
    byStatus: Record<TaskStatus, number>;
  };
  /** Only for admins */
  projects?: { total: number; active: number };
  /** Only for admins */
  employees?: number;
}

export const dashboardService = {
  async summary(user: AuthUser): Promise<DashboardSummary> {
    const isAdmin = user.role === 'Admin';
    const scope: Prisma.TaskWhereInput = isAdmin ? {} : { assignedToId: user.id };

    const [groups, overdue] = await Promise.all([
      taskRepository.groupByStatus(scope),
      taskRepository.count({ ...scope, status: { not: 'Done' }, dueDate: { lt: todayUtc() } }),
    ]);

    const byStatus: Record<TaskStatus, number> = { 'To Do': 0, 'In Progress': 0, Done: 0 };
    for (const group of groups) byStatus[group.status as TaskStatus] = group._count._all;
    const total = byStatus['To Do'] + byStatus['In Progress'] + byStatus.Done;

    const summary: DashboardSummary = {
      scope: isAdmin ? 'all' : 'mine',
      tasks: { total, open: total - byStatus.Done, overdue, byStatus },
    };

    if (isAdmin) {
      const [projectsTotal, projectsActive, employees] = await Promise.all([
        prisma.project.count(),
        prisma.project.count({ where: { status: 'Active' } }),
        prisma.user.count({ where: { role: 'Employee' } }),
      ]);
      summary.projects = { total: projectsTotal, active: projectsActive };
      summary.employees = employees;
    }

    return summary;
  },
};
