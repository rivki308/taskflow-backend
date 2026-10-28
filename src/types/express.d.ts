import type { AuthUser } from '../models';

declare global {
  namespace Express {
    interface Request {
      /** Set by the authenticate middleware — the user identified by the JWT. */
      user?: AuthUser;
    }
  }
}

export {};
