import { beforeEach, describe, expect, it } from 'vitest';
import { api, bearer, prisma, resetDatabase, tokens } from './helpers';

let t: Awaited<ReturnType<typeof tokens>>;

beforeEach(async () => {
  await resetDatabase();
  t = await tokens();
});

const firstTaskOf = (email: string) =>
  prisma.task.findFirstOrThrow({ where: { assignedTo: { email } }, orderBy: { id: 'asc' } });

describe('Comments', () => {
  it('employee lists comments of own task (oldest first, with author)', async () => {
    const task = await prisma.task.findFirstOrThrow({ where: { title: 'Design the login screen' } });
    const res = await api().get(`/api/tasks/${task.id}/comments`).set(bearer(t.noa));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].user).toEqual(expect.objectContaining({ name: 'Dana Admin', role: 'Admin' }));
    expect(res.body.data[1].user.name).toBe('Noa Cohen');
  });

  it('employee adds a comment to own task; the author comes from the token', async () => {
    const task = await firstTaskOf('noa@taskflow.test');
    const res = await api().post(`/api/tasks/${task.id}/comments`).set(bearer(t.noa)).send({ content: '  Working on it  ' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ taskId: task.id, content: 'Working on it', user: { name: 'Noa Cohen' } });

    const list = await api().get(`/api/tasks/${task.id}`).set(bearer(t.noa));
    expect(list.body.data.commentCount).toBeGreaterThan(0);
  });

  it('rejects userId sent by the client (cannot comment in someone else name)', async () => {
    const task = await firstTaskOf('noa@taskflow.test');
    const yossi = await prisma.user.findUniqueOrThrow({ where: { email: 'yossi@taskflow.test' } });
    const res = await api().post(`/api/tasks/${task.id}/comments`).set(bearer(t.noa)).send({ content: 'hi', userId: yossi.id });
    expect(res.status).toBe(400);
  });

  it('rejects empty or whitespace-only content', async () => {
    const task = await firstTaskOf('noa@taskflow.test');
    for (const content of ['', '    ', undefined]) {
      const res = await api().post(`/api/tasks/${task.id}/comments`).set(bearer(t.noa)).send({ content });
      expect(res.status).toBe(400);
    }
  });

  it('employee cannot read or add comments on a task of another employee (403)', async () => {
    const task = await firstTaskOf('yossi@taskflow.test');
    expect((await api().get(`/api/tasks/${task.id}/comments`).set(bearer(t.noa))).status).toBe(403);
    const before = await prisma.comment.count();
    expect((await api().post(`/api/tasks/${task.id}/comments`).set(bearer(t.noa)).send({ content: 'sneaky' })).status).toBe(403);
    expect(await prisma.comment.count()).toBe(before);
  });

  it('admin can comment on any task', async () => {
    const task = await firstTaskOf('yossi@taskflow.test');
    const res = await api().post(`/api/tasks/${task.id}/comments`).set(bearer(t.admin)).send({ content: 'Good job' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('Admin');
  });

  it('404 for comments of a task that does not exist', async () => {
    expect((await api().get('/api/tasks/999999/comments').set(bearer(t.admin))).status).toBe(404);
  });
});
