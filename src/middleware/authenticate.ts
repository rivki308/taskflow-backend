import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../auth/jwt';
import type { AuthUser, Role } from '../models';
import { userRepository } from '../repositories/user.repository';
import { HttpError } from '../utils/http-error';

/**
 * Requires a valid "Authorization: Bearer <token>" header.
 * The user is loaded from the database by the id inside the token, so the
 * client can never choose who it is, and a changed role takes effect at once.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Missing Authorization header. Send: Authorization: Bearer <token>');
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authorization header must be: Bearer <token>');
  }

  let claims;
  try {
    claims = verifyAccessToken(token);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new HttpError(401, 'TOKEN_EXPIRED', 'Token has expired. Please log in again');
    }
    throw new HttpError(401, 'INVALID_TOKEN', 'Token is invalid');
  }

  const user = await userRepository.findByIdWithSecrets(Number(claims.sub));
  if (!user) throw new HttpError(401, 'INVALID_TOKEN', 'Token is invalid');
  if (user.tokenVersion !== claims.tv) {
    throw new HttpError(401, 'TOKEN_REVOKED', 'Token was revoked (logged out). Please log in again');
  }

  req.user = { id: user.id, name: user.name, email: user.email, role: user.role as Role };
  next();
}

/** Returns the authenticated user (use only on routes behind `authenticate`). */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw HttpError.unauthorized();
  return req.user;
}
