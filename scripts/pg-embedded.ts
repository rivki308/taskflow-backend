/**
 * Runs a real PostgreSQL server from the binaries shipped in the
 * "@embedded-postgres/<platform>" npm package — no PostgreSQL installation needed.
 * Used by `npm run db:local` and by the automated tests.
 *
 * PostgreSQL on Windows cannot run from a folder whose path contains non-English
 * characters (e.g. Hebrew folder names), so in that case the binaries are copied
 * once to ~/.taskflow-pg/ (an English-only path) and run from there.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const NON_ASCII = /[^\x00-\x7F]/;

function exe(name: string) {
  return process.platform === 'win32' ? `${name}.exe` : name;
}

export function cacheRoot(): string {
  return process.env.PG_CACHE_DIR ?? path.join(os.homedir(), '.taskflow-pg');
}

/** Folder that contains bin/, lib/, share/ of PostgreSQL. */
export function resolveNativeDir(): string {
  const platform = process.platform === 'win32' ? 'windows' : process.platform;
  const pkgName = `@embedded-postgres/${platform}-${process.arch}`;
  let pkgRoot: string;
  try {
    // The package only exports dist/index.js, so resolve that and go up one folder.
    pkgRoot = path.resolve(path.dirname(require.resolve(pkgName)), '..');
  } catch {
    throw new Error(`Package ${pkgName} is not installed. Run "npm install" first.`);
  }
  const pkgJson = path.join(pkgRoot, 'package.json');
  const nativeDir = path.join(pkgRoot, 'native');
  if (!NON_ASCII.test(nativeDir)) return nativeDir;

  const version = JSON.parse(fs.readFileSync(pkgJson, 'utf8')).version as string;
  const target = path.join(cacheRoot(), `postgres-${version}`);
  if (NON_ASCII.test(target)) {
    throw new Error(`Set PG_CACHE_DIR to a folder with an English-only path (current: ${target})`);
  }
  if (!fs.existsSync(path.join(target, 'bin', exe('postgres')))) {
    console.log(`[pg] Copying PostgreSQL binaries to ${target} (one time only, ~100MB)...`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(nativeDir, target, { recursive: true });
  }
  return target;
}

export interface PgServer {
  url: (database: string) => string;
  createDatabase: (database: string) => Promise<void>;
  stop: () => void;
}

/**
 * Initialises (if needed) and starts PostgreSQL.
 * Only listens on localhost, so "trust" authentication is acceptable for local use.
 */
export async function startPostgres(options: { dataDir: string; port: number }): Promise<PgServer> {
  const binDir = path.join(resolveNativeDir(), 'bin');
  const { dataDir, port } = options;

  if (NON_ASCII.test(dataDir)) {
    throw new Error(`Database folder must have an English-only path: ${dataDir}`);
  }

  if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
    fs.mkdirSync(path.dirname(dataDir), { recursive: true });
    const init = spawnSync(
      path.join(binDir, exe('initdb')),
      ['-D', dataDir, '-U', 'postgres', '--auth=trust', '--encoding=UTF8', '--locale=C'],
      { encoding: 'utf8' },
    );
    if (init.status !== 0) {
      throw new Error(`initdb failed:\n${init.stdout}\n${init.stderr}`);
    }
  }

  const logFile = path.join(dataDir, 'server.log');
  const pgCtl = path.join(binDir, exe('pg_ctl'));
  try {
    // stdio must be 'ignore': the started server inherits the handles and would keep pipes open forever.
    execFileSync(pgCtl, ['-D', dataDir, '-l', logFile, '-w', '-t', '60', '-o', `-p ${port} -c listen_addresses=localhost`, 'start'], {
      stdio: 'ignore',
    });
  } catch (error) {
    const log = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').split('\n').slice(-15).join('\n') : '';
    throw new Error(`PostgreSQL failed to start on port ${port}. Is the port already in use?\n${log}\n${String(error)}`);
  }

  const url = (database: string) => `postgresql://postgres:postgres@localhost:${port}/${database}`;

  return {
    url,
    async createDatabase(database: string) {
      if (!/^[a-z_][a-z0-9_]*$/.test(database)) throw new Error(`Invalid database name: ${database}`);
      // Runs in a short-lived child process, so no Prisma engine stays loaded (on Windows
      // a loaded engine file would block "prisma generate" / "npm run build").
      const prismaCli = require.resolve('prisma/build/index.js');
      const result = spawnSync(
        process.execPath,
        [prismaCli, 'db', 'execute', '--url', url('postgres'), '--stdin'],
        { input: `CREATE DATABASE "${database}";`, encoding: 'utf8' },
      );
      const output = `${result.stdout}\n${result.stderr}`;
      if (result.status !== 0 && !output.includes('already exists')) {
        throw new Error(`Could not create database "${database}":\n${output}`);
      }
    },
    stop() {
      spawnSync(pgCtl, ['-D', dataDir, '-m', 'fast', '-w', 'stop'], { stdio: 'ignore' });
    },
  };
}
