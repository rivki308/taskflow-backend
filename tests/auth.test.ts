import jwt from 'jsonwebtoken';
import { beforeAll, describe, expect, it } from 'vitest';
import { jwtSettings } from '../src/auth/jwt';
import { ADMIN, NOA, api, bearer, login, prisma, resetDatabase } from './helpers';

const SECRET = process.env.JWT_SECRET!;

function forgeToken(payload: object, options: jwt.SignOptions, secret = SECRET) {
  return jwt.sign(payload, secret, {
    issuer: jwtSettings.ISSUER,
    audience: jwtSettings.AUDIENCE,
    algorithm: 'HS256',
    ...options,
  });
}

beforeAll(async () => {
  await resetDatabase();
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials and returns a JWT + safe user data', async () => {
    const res = await api().post('/api/auth/login').send(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.data.tokenType).toBe('Bearer');
    expect(res.body.data.token.split('.')).toHaveLength(3);
    expect(new Date(res.body.data.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(res.body.data.user).toMatchObject({ email: ADMIN.email, role: 'Admin', name: 'Dana Admin' });
    const text = JSON.stringify(res.body);
    expect(text).not.toMatch(/passwordHash|password_hash|tokenVersion|\$2[aby]\$/);
  });

  it('accepts the email in any letter case', async () => {
    const res = await api().post('/api/auth/login').send({ ...NOA, email: 'NOA@TaskFlow.test' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('Employee');
  });

  it('rejects a wrong password with 401', async () => {
    const res = await api().post('/api/auth/login').send({ email: ADMIN.email, password: 'Wrong123!' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.data).toBeUndefined();
  });

  it('gives the same answer for an unknown email (does not reveal which emails exist)', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'nobody@taskflow.test', password: 'Whatever1' });
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
  });

  it('validates the body (400)', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'password']));
  });

  it('returns 400 for invalid JSON', async () => {
    const res = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});

describe('GET /api/auth/me and token checks', () => {
  it('returns the logged-in user', async () => {
    const token = await login(NOA);
    const res = await api().get('/api/auth/me').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email: NOA.email, role: 'Employee' });
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('returns 401 without a token', async () => {
    const res = await api().get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 for a header without "Bearer"', async () => {
    const token = await login(NOA);
    const res = await api().get('/api/auth/me').set('Authorization', token);
    expect(res.status).toBe(401);
  });

  it('returns 401 for a garbage token', async () => {
    const res = await api().get('/api/auth/me').set(bearer('abc.def.ghi'));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 401 for a token signed with a different secret', async () => {
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN.email } });
    const fake = forgeToken({ role: 'Admin', tv: admin.tokenVersion }, { subject: String(admin.id), expiresIn: '1h' }, 'another-secret-another-secret-12345');
    const res = await api().get('/api/auth/me').set(bearer(fake));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 401 TOKEN_EXPIRED for an expired token', async () => {
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN.email } });
    const expired = forgeToken(
      { role: 'Admin', tv: admin.tokenVersion, exp: Math.floor(Date.now() / 1000) - 60 },
      { subject: String(admin.id) },
    );
    const res = await api().get('/api/auth/me').set(bearer(expired));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('rejects a token with alg "none"', async () => {
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN.email } });
    const unsigned = jwt.sign({ role: 'Admin', tv: admin.tokenVersion }, '', {
      algorithm: 'none',
      subject: String(admin.id),
      issuer: jwtSettings.ISSUER,
      audience: jwtSettings.AUDIENCE,
    });
    const res = await api().get('/api/auth/me').set(bearer(unsigned));
    expect(res.status).toBe(401);
  });

  it('takes the identity from the database, not from claims the client could change', async () => {
    // A token whose "role" claim says Admin but belongs to an employee is still treated as Employee.
    const noa = await prisma.user.findUniqueOrThrow({ where: { email: NOA.email } });
    const token = forgeToken({ role: 'Admin', tv: noa.tokenVersion }, { subject: String(noa.id), expiresIn: '1h' });
    const res = await api().get('/api/users').set(bearer(token));
    expect(res.status).toBe(403);
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes the token', async () => {
    const token = await login(NOA);
    expect((await api().get('/api/auth/me').set(bearer(token))).status).toBe(200);

    const out = await api().post('/api/auth/logout').set(bearer(token));
    expect(out.status).toBe(200);

    const after = await api().get('/api/auth/me').set(bearer(token));
    expect(after.status).toBe(401);
    expect(after.body.error.code).toBe('TOKEN_REVOKED');

    // Logging in again gives a new working token
    const fresh = await login(NOA);
    expect((await api().get('/api/auth/me').set(bearer(fresh))).status).toBe(200);
  });

  it('requires a token', async () => {
    expect((await api().post('/api/auth/logout')).status).toBe(401);
  });
});
