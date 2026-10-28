import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/authenticate';
import { authorizeAdmin } from '../middleware/authorize';

export const userRoutes = Router();

userRoutes.use(authenticate, authorizeAdmin); // the whole /api/users area is Admin only

userRoutes.get('/', userController.list);
userRoutes.post('/', userController.create);
