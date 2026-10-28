import { beforeEach, describe, expect, it } from 'vitest';
import { api, bearer, login, prisma, resetDatabase, tokens } from './helpers';

let t: Awaited<ReturnType<typeof tokens>>;

beforeEach(async () => {
  await resetDatabase();
  t = await tokens();
});

describe('Projects', () => {
  it('admin lists all projects with task counts', async () => {
    const res = await api().get('/api/projects').set(bearer(t.admin));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    const website = res.body.data.find((p: { name: string }) => p.name === 'Website Redesign');
    expect(website).toMatchObject({ taskCount: 6, status: 'Active', createdBy: { name: 'Dana Admin' } });
  });

  it('filters projects by status and search', async () => {
    const completed = await api().get('/api/projects?status=Completed').set(bearer(t.admin));
    expect(completed.body.data.map((p: { name: string }) => p.name)).toEqual(['Employee Onboarding']);
    const search = await api().get('/api/projects?search=mobile').set(bearer(t.admin));
    expect(search.body.data.map((p: { name: string }) => p.name)).toEqual(['Mobile App']);
  });

  it('admin creates a project; createdBy comes from the token', async () => {
    const res = await api()
      .post('/api/projects')
      .set(bearer(t.admin))
      .send({ name: 'Marketing Campaign', startDate: '2030-01-01', endDate: '2030-03-01' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Marketing Campaign', status: 'Active', endDate: '2030-03-01', taskCount: 0, createdBy: { name: 'Dana Admin' } });
  });

  it('rejects endDate earlier than startDate (create and update)', async () => {
    const bad = await api().post('/api/projects').set(bearer(t.admin)).send({ name: 'Bad', startDate: '2030-05-01', endDate: '2030-04-01' });
    expect(bad.status).toBe(400);

    // Update only endDate — checked against the startDate stored in the database
    const project = await prisma.project.findFirstOrThrow({ where: { name: 'Mobile App' } });
    const res = await api().patch(`/api/projects/${project.id}`).set(bearer(t.admin)).send({ endDate: '2000-01-01' });
    expect(res.status).toBe(400);
  });

  it('admin updates a project', async () => {
    const project = await prisma.project.findFirstOrThrow({ where: { name: 'Mobile App' } });
    const res = await api().patch(`/api/projects/${project.id}`).set(bearer(t.admin)).send({ status: 'On Hold', description: 'Paused' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'On Hold', description: 'Paused' });
  });

  it('rejects invalid project status', async () => {
    const res = await api().post('/api/projects').set(bearer(t.admin)).send({ name: 'X', startDate: '2030-01-01', status: 'Paused' });
    expect(res.status).toBe(400);
  });

  it('employee cannot create or update projects (403)', async () => {
    const project = await prisma.project.findFirstOrThrow();
    expect((await api().post('/api/projects').set(bearer(t.noa)).send({ name: 'X', startDate: '2030-01-01' })).status).toBe(403);
    expect((await api().patch(`/api/projects/${project.id}`).set(bearer(t.noa)).send({ name: 'X' })).status).toBe(403);
  });

  it('employee sees only projects that contain their tasks', async () => {
    const created = await api().post('/api/projects').set(bearer(t.admin)).send({ name: 'Secret Project', startDate: '2030-01-01' });
    const res = await api().get('/api/projects').set(bearer(t.noa));
    expect(res.status).toBe(200);
    expect(res.body.data.map((p: { name: string }) => p.name)).not.toContain('Secret Project');
    expect((await api().get(`/api/projects/${created.body.data.id}`).set(bearer(t.noa))).status).toBe(403);
  });

  it('404 for a missing project', async () => {
    expect((await api().get('/api/projects/999999').set(bearer(t.admin))).status).toBe(404);
    expect((await api().patch('/api/projects/999999').set(bearer(t.admin)).send({ name: 'x' })).status).toBe(404);
  });
});

describe('Users', () => {
  it('admin lists users without any password data', async () => {
    const res = await api().get('/api/users').set(bearer(t.admin));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(JSON.stringify(res.body)).not.toMatch(/password|tokenVersion|\$2[aby]\$/i);
  });

  it('filters by role (for the "assign to" dropdown)', async () => {
    const res = await api().get('/api/users?role=Employee').set(bearer(t.admin));
    expect(res.body.data.map((u: { name: string }) => u.name)).toEqual(['Noa Cohen', 'Yossi Levi']);
  });

  it('employee cannot list users (403)', async () => {
    expect((await api().get('/api/users').set(bearer(t.noa))).status).toBe(403);
  });

  it('admin creates an employee who can then log in', async () => {
    const res = await api()
      .post('/api/users')
      .set(bearer(t.admin))
      .send({ name: 'Maya Levi', email: 'Maya@TaskFlow.test', password: 'Welcome123' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Maya Levi', email: 'maya@taskflow.test', role: 'Employee' });
    expect(res.body.data.password).toBeUndefined();

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'maya@taskflow.test' } });
    expect(stored.passwordHash).not.toBe('Welcome123');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);

    expect(await login({ email: 'maya@taskflow.test', password: 'Welcome123' })).toBeTruthy();
  });

  it('409 for a duplicate email', async () => {
    const res = await api().post('/api/users').set(bearer(t.admin)).send({ name: 'Copy', email: 'noa@taskflow.test', password: 'Welcome123' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects weak passwords and invalid roles', async () => {
    expect((await api().post('/api/users').set(bearer(t.admin)).send({ name: 'A', email: 'a@t.test', password: 'short' })).status).toBe(400);
    expect((await api().post('/api/users').set(bearer(t.admin)).send({ name: 'A', email: 'a@t.test', password: 'Welcome123', role: 'SuperAdmin' })).status).toBe(400);
  });

  it('employee cannot create users / make themselves admin (403)', async () => {
    const res = await api().post('/api/users').set(bearer(t.noa)).send({ name: 'Evil', email: 'evil@t.test', password: 'Welcome123', role: 'Admin' });
    expect(res.status).toBe(403);
    expect(await prisma.user.count()).toBe(3);
  });
});
