import { z } from 'zod';
import { ROLES } from '../models';
import { requiredText, searchSchema } from './common.schemas';

export const listUsersQuerySchema = z.object({
  role: z.enum(ROLES, { errorMap: () => ({ message: `role must be one of: ${ROLES.join(', ')}` }) }).optional(),
  search: searchSchema,
});

export const createUserSchema = z
  .object({
    name: requiredText('name', 100),
    email: z
      .string({ required_error: 'email is required' })
      .trim()
      .toLowerCase()
      .email('email must be a valid email address')
      .max(255),
    password: z
      .string({ required_error: 'password is required' })
      .min(8, 'password must be at least 8 characters')
      .max(128, 'password must be at most 128 characters')
      .regex(/[A-Za-z]/, 'password must contain a letter')
      .regex(/\d/, 'password must contain a digit'),
    role: z
      .enum(ROLES, { errorMap: () => ({ message: `role must be one of: ${ROLES.join(', ')}` }) })
      .default('Employee'),
  })
  .strict();

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
