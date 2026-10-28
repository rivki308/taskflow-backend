import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { Role } from '../models';

const ISSUER = 'taskflow-pro-api';
const AUDIENCE = 'taskflow-pro-client';
const ALGORITHM = 'HS256';

/** Data stored inside the token. "sub" is the user id, "tv" the token version. */
export interface TokenClaims {
  sub: string;
  role: Role;
  tv: number;
}

export function signAccessToken(user: { id: number; role: Role; tokenVersion: number }) {
  const claims: Omit<TokenClaims, 'sub'> = { role: user.role, tv: user.tokenVersion };
  const token = jwt.sign(claims, env.JWT_SECRET, {
    subject: String(user.id),
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithm: ALGORITHM,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
  const decoded = jwt.decode(token) as { exp: number };
  return { token, expiresAt: new Date(decoded.exp * 1000).toISOString() };
}

/**
 * Verifies signature, algorithm, expiry, issuer and audience.
 * Throws (jsonwebtoken errors) if anything is wrong.
 */
export function verifyAccessToken(token: string): TokenClaims {
  const payload = jwt.verify(token, env.JWT_SECRET, {
    algorithms: [ALGORITHM],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (
    typeof payload !== 'object' ||
    typeof payload.sub !== 'string' ||
    !/^\d+$/.test(payload.sub) ||
    typeof payload.tv !== 'number'
  ) {
    throw new jwt.JsonWebTokenError('Malformed token claims');
  }
  return payload as unknown as TokenClaims;
}

export const jwtSettings = { ISSUER, AUDIENCE, ALGORITHM };
