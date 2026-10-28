import { beforeEach, describe, expect, it } from 'vitest';
import { api, bearer, prisma, resetDatabase, tokens } from './helpers';

let t: Awaited<ReturnType<typeof tokens>>;
let ids: { admin: number; noa: number; yossi: number; website: number; mobile: number };

async function loadIds() {
  const users = await prisma.user.findMany();
  const projects = await prisma.project.findMany();
  const byEmail = (e: string) => users.find((u) => u.email === e)!.id;
  const byName = (n: string) => projects.find((p) => p.name === n)!.id;
  ids = {
    admin: byEmail('admin@taskflow.test'),
    noa: byEmail('noa@taskflow.test'),
    yossi: byEmail('yossi@taskflow.test'),
    website: byName('Website Redesign'),
    mobile: byName('Mobile App'),
  };
}

const taskOf = (assignee: number) => prisma.task.findFirstOrThrow({ where: { assignedToId: assignee }, orderBy: { id: 'asc' } });

beforeEach(async () => {
  await resetDatabase();
  await loadIds();
  t = await tokens();
});

describe('GET /api/tasks — permissions', () => {
  it('admin sees all tasks', async () => {
    const res = await api().get('/api/tasks?pageSize=100').set(bearer(t.admin));
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(12);
    expect(res.body.data).toHaveLength(12);
  });

  it('employee sees only tasks assigned to them', async () => {
    const res = await api().get('/api/tasks?pageSize=100').set(bearer(t.noa));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(6);
    for (const task of res.body.data) expect(task.assignedTo.id).toBe(ids.noa);
  });

  it('employee cannot see other employees tasks via the assignedTo filter', async () => {
    const res = await api().get(`/api/tasks?assignedTo=${ids.yossi}`).set(bearer(t.noa));
    expect(res.status).toBe(200);
    for (const task of res.body.data) expect(task.assignedTo.id).toBe(ids.noa);
  });

  it('requires a token', async () => {
    expect((await api().get('/api/tasks')).status).toBe(401);
  });
});

describe('GET /api/tasks/:id', () => {
  it('employee can read own task', async () => {
    const task = await taskOf(ids.noa);
    const res = await api().get(`/api/tasks/${task.id}`).set(bearer(t.noa));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: task.id, title: task.title, assignedTo: { id: ids.noa } });
    expect(res.body.data.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('employee CANNOT read another employee task by changing the id (403)', async () => {
    const task = await taskOf(ids.yossi);
    const res = await api().get(`/api/tasks/${task.id}`).set(bearer(t.noa));
    expect(res.status).toBe(403);
    expect(res.body.data).toBeUndefined();
  });

  it('404 for a task that does not exist', async () => {
    const res = await api().get('/api/tasks/999999').set(bearer(t.admin));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('400 for an invalid id', async () => {
    expect((await api().get('/api/tasks/abc').set(bearer(t.admin))).status).toBe(400);
    expect((await api().get('/api/tasks/-5').set(bearer(t.admin))).status).toBe(400);
  });
});

describe('POST /api/tasks', () => {
  const valid = () => ({
    title: 'New task from test',
    description: 'Created by an automated test',
    assignedTo: ids.noa,
    projectId: ids.website,
    priority: 'High',
    dueDate: '2030-01-15',
  });

  it('admin creates a task; createdBy comes from the token and status defaults to To Do', async () => {
    const res = await api().post('/api/tasks').set(bearer(t.admin)).send(valid());
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: 'New task from test',
      status: 'To Do',
      priority: 'High',
      dueDate: '2030-01-15',
      assignedTo: { id: ids.noa },
      createdBy: { id: ids.admin },
      project: { id: ids.website },
    });
    const saved = await prisma.task.findUnique({ where: { id: res.body.data.id } });
    expect(saved?.createdById).toBe(ids.admin);
  });

  it('employee cannot create tasks (403)', async () => {
    const res = await api().post('/api/tasks').set(bearer(t.noa)).send(valid());
    expect(res.status).toBe(403);
    expect(await prisma.task.count()).toBe(12);
  });

  it('rejects protected/unknown fields such as createdBy (mass assignment) with 400', async () => {
    const res = await api().post('/api/tasks').set(bearer(t.admin)).send({ ...valid(), createdBy: ids.yossi });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].message).toContain('createdBy');
  });

  it('rejects a project or employee that does not exist', async () => {
    const res = await api().post('/api/tasks').set(bearer(t.admin)).send({ ...valid(), projectId: 99999, assignedTo: 99999 });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['projectId', 'assignedTo']));
  });

  it('does not allow assigning a task to an admin', async () => {
    const res = await api().post('/api/tasks').set(bearer(t.admin)).send({ ...valid(), assignedTo: ids.admin });
    expect(res.status).toBe(400);
  });

  it('rejects invalid status, priority, date and empty title', async () => {
    const cases = [
      { status: 'Finished' },
      { priority: 'Urgent' },
      { dueDate: '2030-02-30' },
      { dueDate: '15/01/2030' },
      { title: '   ' },
      { title: 'x'.repeat(201) },
    ];
    for (const change of cases) {
      const res = await api().post('/api/tasks').set(bearer(t.admin)).send({ ...valid(), ...change });
      expect(res.status, JSON.stringify(change)).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('rejects missing required fields', async () => {
    const res = await api().post('/api/tasks').set(bearer(t.admin)).send({ title: 'Only a title' });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['assignedTo', 'projectId', 'priority', 'dueDate']));
  });
});

describe('PATCH /api/tasks/:id', () => {
  it('employee updates the status of own task', async () => {
    const task = await taskOf(ids.noa);
    const res = await api().patch(`/api/tasks/${task.id}`).set(bearer(t.noa)).send({ status: 'Done' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Done');
    expect((await prisma.task.findUnique({ where: { id: task.id } }))?.status).toBe('Done');
  });

  it('employee cannot change protected fields (403)', async () => {
    const task = await taskOf(ids.noa);
    for (const body of [{ title: 'Hacked' }, { assignedTo: ids.yossi }, { status: 'Done', projectId: ids.mobile }, { createdBy: ids.noa }]) {
      const res = await api().patch(`/api/tasks/${task.id}`).set(bearer(t.noa)).send(body);
      expect(res.status, JSON.stringify(body)).toBe(403);
    }
    const unchanged = await prisma.task.findUnique({ where: { id: task.id } });
    expect(unchanged).toMatchObject({ title: task.title, assignedToId: ids.noa, projectId: task.projectId, status: task.status });
  });

  it('employee cannot update a task of another employee (403)', async () => {
    const task = await taskOf(ids.yossi);
    const res = await api().patch(`/api/tasks/${task.id}`).set(bearer(t.noa)).send({ status: 'Done' });
    expect(res.status).toBe(403);
  });

  it('employee gets 400 for an invalid status', async () => {
    const task = await taskOf(ids.noa);
    const res = await api().patch(`/api/tasks/${task.id}`).set(bearer(t.noa)).send({ status: 'Almost' });
    expect(res.status).toBe(400);
  });

  it('admin edits several fields and can reassign', async () => {
    const task = await taskOf(ids.noa);
    const res = await api()
      .patch(`/api/tasks/${task.id}`)
      .set(bearer(t.admin))
      .send({ title: 'Edited title', priority: 'Low', assignedTo: ids.yossi, dueDate: '2031-05-05', description: null });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      title: 'Edited title',
      priority: 'Low',
      assignedTo: { id: ids.yossi },
      dueDate: '2031-05-05',
      description: null,
    });
  });

  it('admin cannot change createdBy and must send at least one field', async () => {
    const task = await taskOf(ids.noa);
    expect((await api().patch(`/api/tasks/${task.id}`).set(bearer(t.admin)).send({ createdBy: ids.yossi })).status).toBe(400);
    expect((await api().patch(`/api/tasks/${task.id}`).set(bearer(t.admin)).send({})).status).toBe(400);
  });

  it('404 when the task does not exist', async () => {
    expect((await api().patch('/api/tasks/999999').set(bearer(t.admin)).send({ status: 'Done' })).status).toBe(404);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('admin deletes a task together with its comments', async () => {
    const task = await prisma.task.findFirstOrThrow({ where: { comments: { some: {} } } });
    const res = await api().delete(`/api/tasks/${task.id}`).set(bearer(t.admin));
    expect(res.status).toBe(204);
    expect(await prisma.task.findUnique({ where: { id: task.id } })).toBeNull();
    expect(await prisma.comment.count({ where: { taskId: task.id } })).toBe(0);
    expect((await api().get(`/api/tasks/${task.id}`).set(bearer(t.admin))).status).toBe(404);
  });

  it('employee cannot delete, even own task (403)', async () => {
    const task = await taskOf(ids.noa);
    expect((await api().delete(`/api/tasks/${task.id}`).set(bearer(t.noa))).status).toBe(403);
    expect(await prisma.task.findUnique({ where: { id: task.id } })).not.toBeNull();
  });

  it('404 for a missing task', async () => {
    expect((await api().delete('/api/tasks/999999').set(bearer(t.admin))).status).toBe(404);
  });
});
