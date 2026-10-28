/**
 * Environment used by the automated tests (shared by vitest.config.ts and global-setup.ts).
 * Tests use a separate database — by default a temporary embedded PostgreSQL,
 * or TEST_DATABASE_URL pointing to an empty database whose name contains "test".
 */
export const TEST_DB_PORT = 5544;

export const testEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: process.env.TEST_DATABASE_URL ?? `postgresql://postgres:postgres@localhost:${TEST_DB_PORT}/taskflow_test`,
  JWT_SECRET: 'test-only-secret-that-is-long-enough-1234567890',
  JWT_EXPIRES_IN: '15m',
  CORS_ORIGINS: 'http://localhost:5173',
  LOGIN_RATE_LIMIT_MAX: '1000',
};
