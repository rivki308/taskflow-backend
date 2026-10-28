import { Router } from 'express';
import { commentController } from '../controllers/comment.controller';
import { taskController } from '../controllers/task.controller';
import { authenticate } from '../middleware/authenticate';
import { authorizeAdmin } from '../middleware/authorize';

export const taskRoutes = Router();

taskRoutes.use(authenticate);

// Tasks — ownership checks (employee sees only own tasks) happen in taskService
taskRoutes.get('/', taskController.list);
taskRoutes.get('/:id', taskController.getById);
taskRoutes.post('/', authorizeAdmin, taskController.create);
taskRoutes.patch('/:id', taskController.update);
taskRoutes.delete('/:id', authorizeAdmin, taskController.remove);

// Comments of a task
taskRoutes.get('/:id/comments', commentController.list);
taskRoutes.post('/:id/comments', commentController.create);
