import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
const router = Router();
const userController = new UserController();

router.get('/exclusive',(req, res) => userController.getUserProfile(req, res));
export default router;