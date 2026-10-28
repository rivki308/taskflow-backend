import 'dotenv/config';
import { z } from 'zod';

/**
 * All configuration comes from environment variables (.env locally,
 * "Environment" tab on Render). The server refuses to start if a
 * required value is missing or unsafe.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL is required' })
    .min(1, 'DATABASE_URL is required')
    .refine((v) => v.startsWith('postgresql://') || v.startsWith('postgres://'), {
      message: 'DATABASE_URL must start with postgresql:// or postgres://',
    }),
  JWT_SECRET: z
    .string({ required_error: 'JWT_SECRET is required' })
    .min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN must look like 15m, 2h or 1d')
    .default('2h'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`\n[config] Invalid environment variables:\n${problems}\n`);
  console.error('[config] Copy .env.example to .env and fill in the values (see README.md).\n');
  process.exit(1);
}

const raw = parsed.data;

if (raw.NODE_ENV === 'production' && raw.JWT_SECRET.includes('replace-with')) {
  console.error('[config] JWT_SECRET still has the example value. Set a real random secret.');
  process.exit(1);
}

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  corsOrigins: raw.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean),
};
