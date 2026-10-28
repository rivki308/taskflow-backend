import type { NextFunction, Request, Response } from 'express';
import type { Role } from '../models';
import { HttpError } from '../utils/http-error';

/**
 * Allows the request only for the given roles. Must run after `authenticate`.
 *   router.post('/', authenticate, authorize('Admin'), controller.create)
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw HttpError.unauthorized();
    if (!allowedRoles.includes(req.user.role)) {
      throw HttpError.forbidden(`This action requires role: ${allowedRoles.join(' or ')}`);
    }
    next();
  };
}

export const authorizeAdmin = authorize('Admin');
