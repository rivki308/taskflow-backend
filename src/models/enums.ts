/** Allowed values — the same lists are enforced by CHECK constraints in the database. */

export const ROLES = ['Admin', 'Employee'] as const;
export type Role = (typeof ROLES)[number];

export const TASK_STATUSES = ['To Do', 'In Progress', 'Done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const PROJECT_STATUSES = ['Active', 'Completed', 'On Hold'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const TASK_SORT_FIELDS = ['dueDate', 'createdAt', 'title'] as const;
export type TaskSortField = (typeof TASK_SORT_FIELDS)[number];
