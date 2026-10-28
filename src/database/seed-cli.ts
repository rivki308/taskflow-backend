import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { DEV_SEED_DEFAULTS, seedDatabase, type SeedOptions } from './seed';

/**
 * npm run db:seed          development — DELETES all data and inserts demo data
 *                          (uses demo passwords if SEED_* are not set)
 * npm run db:seed:prod     production — passwords MUST come from env variables
 *
 * --if-empty               only seed when the database has no users yet; never deletes
 *                          anything. Used automatically on Render start (npm run start:render).
 */
const ifEmpty = process.argv.includes('--if-empty');
const isProduction = process.env.NODE_ENV === 'production';

function resolveOptions(): SeedOptions | null {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || DEV_SEED_DEFAULTS.adminEmail;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || '';
  const employeePassword = process.env.SEED_EMPLOYEE_PASSWORD || '';

  if (isProduction) {
    if (adminPassword.length < 10 || employeePassword.length < 10) {
      console.error(
        '[seed] In production set SEED_ADMIN_PASSWORD and SEED_EMPLOYEE_PASSWORD (at least 10 characters each).\n' +
          '[seed] Known demo passwords are never used in production.',
      );
      return null;
    }
    return { adminEmail, adminPassword, employeePassword };
  }

  return {
    adminEmail,
    adminPassword: adminPassword || DEV_SEED_DEFAULTS.adminPassword,
    employeePassword: employeePassword || DEV_SEED_DEFAULTS.employeePassword,
  };
}

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    if (ifEmpty) {
      const users = await prisma.user.count();
      if (users > 0) {
        console.log(`[seed] Database already has ${users} user(s) — skipping seed.`);
        return 0;
      }
    }

    const options = resolveOptions();
    // With --if-empty a missing password must not stop the server from starting.
    if (!options) return ifEmpty ? 0 : 1;

    const result = await seedDatabase(prisma, options);
    console.log('[seed] Done:');
    console.log(`  users:    ${1 + result.employees.length}`);
    console.log(`  projects: ${result.projects.length}`);
    console.log(`  tasks:    ${result.tasks.length}`);
    console.log(`  Admin login:    ${result.admin.email}`);
    console.log(`  Employee login: ${result.employees.map((e) => e.email).join(', ')}`);
    if (!isProduction && !process.env.SEED_ADMIN_PASSWORD) {
      console.log(`  Passwords (development only): Admin=${DEV_SEED_DEFAULTS.adminPassword}  Employees=${DEV_SEED_DEFAULTS.employeePassword}`);
    }
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error('[seed] Failed:', error);
    process.exit(ifEmpty ? 0 : 1);
  });
