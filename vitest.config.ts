import { defineConfig } from 'vitest/config';
import { testEnv } from './tests/test-env';

/**
 * Tests run against a REAL PostgreSQL database that is separate from your data
 * (see tests/test-env.ts and tests/global-setup.ts).
 */
export default defineConfig({
  test: {
    globalSetup: ['tests/global-setup.ts'],
    include: ['tests/**/*.test.ts'],
    fileParallelism: false, // all test files share one database
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: testEnv,
  },
});
