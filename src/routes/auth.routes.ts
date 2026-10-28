import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { loginRateLimit } from '../middleware/rate-limit';

export const authRoutes = Router();

authRoutes.post('/login', loginRateLimit, authController.login);
authRoutes.post('/logout', authenticate, authController.logout);
authRoutes.get('/me', authenticate, authController.me);
