import { z } from 'zod';
import { isValidDateOnly } from '../utils/dates';

/** Positive integer id from the URL, e.g. /api/tasks/:id */
export const idParamSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'id must be a number' })
    .int('id must be an integer')
    .positive('id must be a positive number')
    .max(2147483647, 'id is too large'),
});

/** A calendar date in YYYY-MM-DD format */
export const dateOnlySchema = z
  .string({ required_error: 'Date is required' })
  .refine(isValidDateOnly, { message: 'Must be a valid date in YYYY-MM-DD format' });

/** Positive integer id inside a JSON body (assignedTo, projectId) */
export const foreignIdSchema = (field: string) =>
  z
    .number({ required_error: `${field} is required`, invalid_type_error: `${field} must be a number` })
    .int(`${field} must be an integer`)
    .positive(`${field} must be a positive number`)
    .max(2147483647, `${field} is too large`);

/** Trimmed, non-empty text */
export const requiredText = (field: string, max: number) =>
  z
    .string({ required_error: `${field} is required`, invalid_type_error: `${field} must be a string` })
    .trim()
    .min(1, `${field} cannot be empty`)
    .max(max, `${field} must be at most ${max} characters`);

/** Optional text: empty string or null are saved as null */
export const optionalText = (field: string, max: number) =>
  z
    .string({ invalid_type_error: `${field} must be a string` })
    .trim()
    .max(max, `${field} must be at most ${max} characters`)
    .nullish()
    .transform((value) => (value ? value : null));

/** Optional search text from the query string */
export const searchSchema = z.string().trim().max(100, 'search must be at most 100 characters').optional();
