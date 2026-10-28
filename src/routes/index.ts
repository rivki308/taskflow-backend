import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { healthController } from '../controllers/health.controller';
import { authenticate } from '../middleware/authenticate';
import { authRoutes } from './auth.routes';
import { projectRoutes } from './project.routes';
import { taskRoutes } from './task.routes';
import { userRoutes } from './user.routes';

/** Everything under /api */
export const apiRoutes = Router();

apiRoutes.get('/health', healthController.check);
apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/users', userRoutes);
apiRoutes.use('/projects', projectRoutes);
apiRoutes.use('/tasks', taskRoutes);
apiRoutes.get('/dashboard/summary', authenticate, dashboardController.summary);
