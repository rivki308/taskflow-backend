import { z } from 'zod';

export const loginSchema = z
  .object({
    email: z
      .string({ required_error: 'email is required', invalid_type_error: 'email must be a string' })
      .trim()
      .toLowerCase()
      .email('email must be a valid email address')
      .max(255),
    password: z
      .string({ required_error: 'password is required', invalid_type_error: 'password must be a string' })
      .min(1, 'password is required')
      .max(128, 'password must be at most 128 characters'),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
