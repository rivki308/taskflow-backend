import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/** Limits login attempts per IP to slow down password guessing. */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Try again in 15 minutes' },
    });
  },
});
