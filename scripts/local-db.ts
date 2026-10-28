/**
 * npm run db:local
 *
 * Starts a real PostgreSQL 17 server on your computer without installing
 * PostgreSQL. For local development only (the cloud uses Neon/Supabase).
 *
 *   Connection string: postgresql://postgres:postgres@localhost:5433/taskflow
 *
 * Data is kept in ~/.taskflow-pg/data-local between runs (or LOCAL_DB_DIR).
 * Keep the window open while you work; press Ctrl+C to stop the database.
 */
import path from 'node:path';
import { cacheRoot, startPostgres } from './pg-embedded';

const PORT = Number(process.env.LOCAL_DB_PORT ?? 5433);
const DATABASE = 'taskflow';
const dataDir = path.resolve(process.env.LOCAL_DB_DIR ?? path.join(cacheRoot(), 'data-local'));

async function main() {
  console.log(`[local-db] Data folder: ${dataDir}`);
  const server = await startPostgres({ dataDir, port: PORT });
  await server.createDatabase(DATABASE);

  console.log('[local-db] PostgreSQL is running.');
  console.log(`[local-db] DATABASE_URL=${server.url(DATABASE)}`);
  console.log('[local-db] Keep this window open. Press Ctrl+C to stop.');

  const stop = () => {
    console.log('\n[local-db] Stopping...');
    server.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  setInterval(() => {}, 1 << 30); // keep the process alive
}

main().catch((error) => {
  console.error('[local-db] Failed to start:', error instanceof Error ? error.message : error);
  process.exit(1);
});
