import SwaggerParser from '@apidevtools/swagger-parser';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { openApiDocument } from '../src/docs/openapi';
import { api, bearer, prisma, resetDatabase, tokens } from './helpers';

beforeAll(async () => {
  await resetDatabase();
});

/** Every endpoint the server implements (method + OpenAPI path). */
const ENDPOINTS: [string, string][] = [
  ['get', '/api/health'],
  ['post', '/api/auth/login'],
  ['post', '/api/auth/logout'],
  ['get', '/api/auth/me'],
  ['get', '/api/dashboard/summary'],
  ['get', '/api/tasks'],
  ['post', '/api/tasks'],
  ['get', '/api/tasks/{id}'],
  ['patch', '/api/tasks/{id}'],
  ['delete', '/api/tasks/{id}'],
  ['get', '/api/tasks/{id}/comments'],
  ['post', '/api/tasks/{id}/comments'],
  ['get', '/api/projects'],
  ['post', '/api/projects'],
  ['get', '/api/projects/{id}'],
  ['patch', '/api/projects/{id}'],
  ['get', '/api/users'],
  ['post', '/api/users'],
];

describe('Health & general HTTP behaviour', () => {
  it('GET /api/health reports server and database OK without secrets', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'ok' });
    expect(JSON.stringify(res.body)).not.toMatch(/postgres|secret|password/i);
  });

  it('unknown API route returns a JSON 404', async () => {
    const res = await api().get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: 'NOT_FOUND', message: 'Route GET /api/does-not-exist does not exist' });
  });

  it('CORS allows the configured client origin and not others', async () => {
    const ok = await api().options('/api/tasks').set('Origin', 'http://localhost:5173').set('Access-Control-Request-Method', 'GET');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const bad = await api().options('/api/tasks').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'GET');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rejects request bodies that are too large (413)', async () => {
    const t = await tokens();
    const res = await api().post('/api/tasks').set(bearer(t.admin)).send({ title: 'x'.repeat(200_000) });
    expect(res.status).toBe(413);
  });

  it('every protected endpoint returns 401 without a token', async () => {
    for (const [method, route] of ENDPOINTS) {
      if (route === '/api/health' || route === '/api/auth/login') continue;
      const url = route.replace('{id}', '1');
      const res = await (api() as unknown as Record<string, (u: string) => Promise<{ status: number }>>)[method](url);
      expect(res.status, `${method.toUpperCase()} ${url}`).toBe(401);
    }
  });
});

describe('Swagger / OpenAPI', () => {
  it('is a valid OpenAPI 3 document', async () => {
    const doc = JSON.parse(JSON.stringify(openApiDocument));
    await expect(SwaggerParser.validate(doc)).resolves.toBeTruthy();
  });

  it('documents every endpoint, with Bearer security on protected ones', () => {
    const paths = openApiDocument.paths as unknown as Record<string, Record<string, { security?: unknown[]; responses: object }>>;
    for (const [method, route] of ENDPOINTS) {
      const op = paths[route]?.[method];
      expect(op, `${method.toUpperCase()} ${route} missing in OpenAPI`).toBeDefined();
      if (route !== '/api/health' && route !== '/api/auth/login') {
        expect(op!.security, `${method} ${route}`).toEqual([{ bearerAuth: [] }]);
        expect(Object.keys(op!.responses)).toContain('401');
      }
    }
    expect(openApiDocument.components.securitySchemes.bearerAuth).toMatchObject({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' });
  });

  it('serves Swagger UI at /api-docs and the JSON at /api-docs.json', async () => {
    const ui = await api().get('/api-docs/');
    expect(ui.status).toBe(200);
    expect(ui.text).toContain('swagger-ui');
    const json = await api().get('/api-docs.json');
    expect(json.status).toBe(200);
    expect(json.body.openapi).toMatch(/^3\./);
  });

  it('docs/openapi.json file is up to date with the code', () => {
    const file = path.join(__dirname, '..', 'docs', 'openapi.json');
    expect(fs.existsSync(file), 'run: npm run openapi:export').toBe(true);
    expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual(JSON.parse(JSON.stringify(openApiDocument)));
  });
});

describe('Prisma & database rules', () => {
  it('prisma schema is valid', () => {
    const out = execSync('npx prisma validate', { encoding: 'utf8', stdio: 'pipe' });
    expect(out).toContain('is valid');
  });

  it('migration was applied', async () => {
    const rows = await prisma.$queryRaw<{ migration_name: string }[]>`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL`;
    expect(rows.map((r) => r.migration_name)).toContain('20261019000000_init');
  });

  it('CHECK constraints reject invalid values even without the API', async () => {
    const task = await prisma.task.findFirstOrThrow();
    await expect(prisma.task.update({ where: { id: task.id }, data: { status: 'Finished' } })).rejects.toThrow();
    await expect(prisma.task.update({ where: { id: task.id }, data: { priority: 'Urgent' } })).rejects.toThrow();
    await expect(prisma.task.update({ where: { id: task.id }, data: { title: '   ' } })).rejects.toThrow();
    const user = await prisma.user.findFirstOrThrow();
    await expect(prisma.user.update({ where: { id: user.id }, data: { role: 'Root' } })).rejects.toThrow();
    const project = await prisma.project.findFirstOrThrow();
    await expect(
      prisma.project.update({ where: { id: project.id }, data: { startDate: new Date('2030-01-10'), endDate: new Date('2030-01-01') } }),
    ).rejects.toThrow();
    await expect(prisma.comment.create({ data: { taskId: task.id, userId: user.id, content: '  ' } })).rejects.toThrow();
  });

  it('foreign keys reject references to rows that do not exist', async () => {
    const task = await prisma.task.findFirstOrThrow();
    await expect(prisma.task.update({ where: { id: task.id }, data: { projectId: 999999 } })).rejects.toThrow();
  });

  it('a project with tasks cannot be deleted (RESTRICT)', async () => {
    const project = await prisma.project.findFirstOrThrow({ where: { tasks: { some: {} } } });
    await expect(prisma.project.delete({ where: { id: project.id } })).rejects.toThrow();
  });

  it('email is unique', async () => {
    const user = await prisma.user.findFirstOrThrow();
    await expect(
      prisma.user.create({ data: { name: 'Dup', email: user.email, passwordHash: 'x', role: 'Employee' } }),
    ).rejects.toThrow();
  });
});
