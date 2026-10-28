import type { Role, TaskPriority, TaskStatus, ProjectStatus } from './enums';

export * from './enums';

/**
 * Public shapes returned by the API (camelCase JSON).
 * Sensitive columns such as password_hash / token_version never appear here.
 * Dates (DATE columns) are returned as "YYYY-MM-DD", timestamps as ISO strings.
 */

export interface UserDto {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface UserSummary {
  id: number;
  name: string;
}

export interface ProjectDto {
  id: number;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  status: ProjectStatus;
  createdBy: UserSummary;
  taskCount: number;
  createdAt: string;
}

export interface TaskDto {
  id: number;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  isOverdue: boolean;
  assignedTo: UserSummary;
  createdBy: UserSummary;
  project: { id: number; name: string };
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommentDto {
  id: number;
  taskId: number;
  content: string;
  user: UserSummary & { role: Role };
  createdAt: string;
}

/** The user identified from the JWT, attached to every authenticated request. */
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
