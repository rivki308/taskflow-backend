import { Router } from 'express';
import { projectController } from '../controllers/project.controller';
import { authenticate } from '../middleware/authenticate';
import { authorizeAdmin } from '../middleware/authorize';

export const projectRoutes = Router();

projectRoutes.use(authenticate);

projectRoutes.get('/', projectController.list);
projectRoutes.get('/:id', projectController.getById);
projectRoutes.post('/', authorizeAdmin, projectController.create);
projectRoutes.patch('/:id', authorizeAdmin, projectController.update);
