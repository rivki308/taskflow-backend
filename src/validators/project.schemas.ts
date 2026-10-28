import { z } from 'zod';
import { PROJECT_STATUSES } from '../models';
import { dateOnlySchema, optionalText, requiredText, searchSchema } from './common.schemas';

const statusSchema = z.enum(PROJECT_STATUSES, {
  errorMap: () => ({ message: `status must be one of: ${PROJECT_STATUSES.join(', ')}` }),
});

const endAfterStart = (data: { startDate?: string; endDate?: string | null }) =>
  !data.startDate || !data.endDate || data.endDate >= data.startDate;

const endAfterStartError = {
  message: 'endDate cannot be earlier than startDate',
  path: ['endDate'],
};

export const listProjectsQuerySchema = z.object({
  status: statusSchema.optional(),
  search: searchSchema,
});

export const createProjectSchema = z
  .object({
    name: requiredText('name', 150),
    description: optionalText('description', 5000),
    startDate: dateOnlySchema,
    endDate: dateOnlySchema.nullish().transform((v) => v ?? null),
    status: statusSchema.default('Active'),
  })
  .strict()
  .refine(endAfterStart, endAfterStartError);

export const updateProjectSchema = z
  .object({
    name: requiredText('name', 150).optional(),
    description: optionalText('description', 5000).optional(),
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.nullable().optional(),
    status: statusSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'Send at least one field to update' })
  .refine(endAfterStart, endAfterStartError);

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
