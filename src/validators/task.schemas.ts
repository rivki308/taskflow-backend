import { z } from 'zod';
import { TASK_PRIORITIES, TASK_SORT_FIELDS, TASK_STATUSES } from '../models';
import { dateOnlySchema, foreignIdSchema, optionalText, requiredText, searchSchema } from './common.schemas';

const statusSchema = z.enum(TASK_STATUSES, {
  errorMap: () => ({ message: `status must be one of: ${TASK_STATUSES.join(', ')}` }),
});

const prioritySchema = z.enum(TASK_PRIORITIES, {
  errorMap: () => ({ message: `priority must be one of: ${TASK_PRIORITIES.join(', ')}` }),
});

const queryId = (field: string) =>
  z.coerce
    .number({ invalid_type_error: `${field} must be a number` })
    .int()
    .positive(`${field} must be a positive number`)
    .max(2147483647)
    .optional();

/** GET /api/tasks query string — every filter is optional. */
export const listTasksQuerySchema = z.object({
  search: searchSchema,
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  projectId: queryId('projectId'),
  assignedTo: queryId('assignedTo'),
  overdue: z
    .enum(['true', 'false'], { errorMap: () => ({ message: 'overdue must be true or false' }) })
    .transform((v) => v === 'true')
    .optional(),
  sortBy: z
    .enum(TASK_SORT_FIELDS, {
      errorMap: () => ({ message: `sortBy must be one of: ${TASK_SORT_FIELDS.join(', ')}` }),
    })
    .default('dueDate'),
  sortOrder: z
    .enum(['asc', 'desc'], { errorMap: () => ({ message: 'sortOrder must be asc or desc' }) })
    .default('asc'),
  page: z.coerce.number({ invalid_type_error: 'page must be a number' }).int().min(1, 'page must be at least 1').default(1),
  pageSize: z.coerce
    .number({ invalid_type_error: 'pageSize must be a number' })
    .int()
    .min(1, 'pageSize must be at least 1')
    .max(100, 'pageSize must be at most 100')
    .default(10),
});

/** POST /api/tasks — Admin only. createdBy is NOT accepted: it comes from the token. */
export const createTaskSchema = z
  .object({
    title: requiredText('title', 200),
    description: optionalText('description', 5000),
    assignedTo: foreignIdSchema('assignedTo'),
    projectId: foreignIdSchema('projectId'),
    priority: prioritySchema,
    status: statusSchema.default('To Do'),
    dueDate: dateOnlySchema,
  })
  .strict();

/** PATCH /api/tasks/:id by an Admin — any editable field. */
export const adminUpdateTaskSchema = z
  .object({
    title: requiredText('title', 200).optional(),
    description: optionalText('description', 5000).optional(),
    assignedTo: foreignIdSchema('assignedTo').optional(),
    projectId: foreignIdSchema('projectId').optional(),
    priority: prioritySchema.optional(),
    status: statusSchema.optional(),
    dueDate: dateOnlySchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'Send at least one field to update' });

/** PATCH /api/tasks/:id by an Employee — only the status may change. */
export const employeeUpdateTaskSchema = z
  .object({
    status: statusSchema,
  })
  .strict();

/** Fields an employee is allowed to send in PATCH /api/tasks/:id */
export const EMPLOYEE_EDITABLE_TASK_FIELDS = ['status'] as const;

export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type AdminUpdateTaskInput = z.infer<typeof adminUpdateTaskSchema>;
export type EmployeeUpdateTaskInput = z.infer<typeof employeeUpdateTaskSchema>;
