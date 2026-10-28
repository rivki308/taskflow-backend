import { beforeAll, describe, expect, it } from 'vitest';
import { api, bearer, prisma, resetDatabase, tokens } from './helpers';

let t: Awaited<ReturnType<typeof tokens>>;

beforeAll(async () => {
  await resetDatabase();
  t = await tokens();
});

const list = (query: string, token = t.admin) => api().get(`/api/tasks?${query}`).set(bearer(token));

describe('GET /api/tasks — search, filter, sort, pagination', () => {
  it('searches in the title, case-insensitive', async () => {
    const res = await list('search=LOGIN&pageSize=100');
    expect(res.status).toBe(200);
    const titles = res.body.data.map((x: { title: string }) => x.title);
    expect(titles).toEqual(expect.arrayContaining(['Design the login screen', 'Test login on Android']));
    for (const title of titles) expect(title.toLowerCase()).toContain('login');
  });

  it('filters by status', async () => {
    const res = await list('status=Done&pageSize=100');
    expect(res.body.data.length).toBe(3);
    for (const task of res.body.data) expect(task.status).toBe('Done');
  });

  it('filters by status with a space ("In Progress")', async () => {
    const res = await list('status=In%20Progress&pageSize=100');
    expect(res.body.data.length).toBe(3);
  });

  it('filters by priority and project together', async () => {
    const mobile = await prisma.project.findFirstOrThrow({ where: { name: 'Mobile App' } });
    const res = await list(`priority=High&projectId=${mobile.id}&pageSize=100`);
    expect(res.body.data.length).toBe(2);
    for (const task of res.body.data) {
      expect(task.priority).toBe('High');
      expect(task.project.id).toBe(mobile.id);
    }
  });

  it('filters overdue tasks (due date passed and not Done)', async () => {
    const res = await list('overdue=true&pageSize=100');
    expect(res.body.data.length).toBe(2);
    for (const task of res.body.data) {
      expect(task.isOverdue).toBe(true);
      expect(task.status).not.toBe('Done');
    }
  });

  it('sorts by title ascending and descending', async () => {
    const asc = (await list('sortBy=title&sortOrder=asc&pageSize=100')).body.data.map((x: { title: string }) => x.title);
    const desc = (await list('sortBy=title&sortOrder=desc&pageSize=100')).body.data.map((x: { title: string }) => x.title);
    expect(asc).toEqual([...asc].sort());
    expect(desc).toEqual([...asc].reverse());
  });

  it('sorts by due date (default ascending)', async () => {
    const dates = (await list('pageSize=100')).body.data.map((x: { dueDate: string }) => x.dueDate);
    expect(dates).toEqual([...dates].sort());
  });

  it('paginates', async () => {
    const page1 = await list('pageSize=5&page=1');
    const page3 = await list('pageSize=5&page=3');
    expect(page1.body.pagination).toEqual({ page: 1, pageSize: 5, total: 12, totalPages: 3 });
    expect(page1.body.data).toHaveLength(5);
    expect(page3.body.data).toHaveLength(2);
    const firstIds = page1.body.data.map((x: { id: number }) => x.id);
    for (const task of page3.body.data) expect(firstIds).not.toContain(task.id);
  });

  it('employee filters apply only to their own tasks', async () => {
    const res = await list('status=Done&pageSize=100', t.yossi);
    expect(res.body.data.map((x: { title: string }) => x.title)).toEqual(['Update onboarding checklist']);
  });

  it('rejects invalid query parameters', async () => {
    for (const q of ['sortBy=password', 'sortOrder=up', 'pageSize=1000', 'page=0', 'status=Closed', 'priority=1', 'overdue=yes', 'projectId=abc']) {
      const res = await list(q);
      expect(res.status, q).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('is safe against SQL-injection-looking input', async () => {
    const res = await list(`search=${encodeURIComponent("' OR 1=1; DROP TABLE tasks; --")}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(await prisma.task.count()).toBe(12);
  });
});

describe('GET /api/dashboard/summary', () => {
  it('admin gets numbers for everything', async () => {
    const res = await api().get('/api/dashboard/summary').set(bearer(t.admin));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      scope: 'all',
      tasks: { total: 12, open: 9, overdue: 2, byStatus: { 'To Do': 6, 'In Progress': 3, Done: 3 } },
      projects: { total: 3, active: 2 },
      employees: 2,
    });
  });

  it('employee gets numbers only for their own tasks', async () => {
    const res = await api().get('/api/dashboard/summary').set(bearer(t.noa));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      scope: 'mine',
      tasks: { total: 6, open: 4, overdue: 1, byStatus: { 'To Do': 3, 'In Progress': 1, Done: 2 } },
    });
  });
});
