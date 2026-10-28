import { PrismaClient } from '@prisma/client';

/**
 * Single shared Prisma client. Prisma always sends parameterized queries,
 * which protects against SQL injection.
 */
export const prisma = new PrismaClient({
  // In tests many errors are caused on purpose, so Prisma's own error log is turned off there.
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : process.env.NODE_ENV === 'test' ? [] : ['error'],
});
