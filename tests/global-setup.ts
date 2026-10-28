import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startPostgres, type PgServer } from '../scripts/pg-embedded';
import { TEST_DB_PORT, testEnv } from './test-env';

let server: PgServer | undefined;
let dataDir: string | undefined;

/** Runs once before all test files: prepares an isolated test database. */
export async function setup() {
  const url = testEnv.DATABASE_URL;
  const dbName = new URL(url).pathname.slice(1);
  if (!dbName.includes('test')) {
    throw new Error(`Refusing to run tests on database "${dbName}" — its name must contain "test".`);
  }

  if (!process.env.TEST_DATABASE_URL) {
    dataDir = path.join(os.tmpdir(), `taskflow-test-db-${process.pid}`);
    fs.rmSync(dataDir, { recursive: true, force: true });
    server = await startPostgres({ dataDir, port: TEST_DB_PORT });
    await server.createDatabase(dbName);
  }

  // Apply the real migrations — the same ones used in production.
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' });
}

export async function teardown() {
  server?.stop();
  if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
}
