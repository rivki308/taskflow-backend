import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/database/prisma';
import { DEV_SEED_DEFAULTS, seedDatabase } from '../src/database/seed';

export const app = createApp();
export const api = () => request(app);

export const ADMIN = { email: DEV_SEED_DEFAULTS.adminEmail, password: DEV_SEED_DEFAULTS.adminPassword };
export const NOA = { email: 'noa@taskflow.test', password: DEV_SEED_DEFAULTS.employeePassword };
export const YOSSI = { email: 'yossi@taskflow.test', password: DEV_SEED_DEFAULTS.employeePassword };

/** Fresh demo data: 1 admin, 2 employees (Noa, Yossi), 3 projects, 12 tasks, 4 comments. */
export function resetDatabase() {
  return seedDatabase(prisma, DEV_SEED_DEFAULTS);
}

export async function login(user: { email: string; password: string }): Promise<string> {
  const res = await api().post('/api/auth/login').send(user);
  if (res.status !== 200) throw new Error(`Login failed for ${user.email}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data.token as string;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function tokens() {
  const [admin, noa, yossi] = await Promise.all([login(ADMIN), login(NOA), login(YOSSI)]);
  return { admin, noa, yossi };
}

export { prisma };
