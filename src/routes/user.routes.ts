import { Router } from 'express';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { UserController } from '../controllers/user.controller';
const router = Router();
const userController = new UserController();

router.post('/verify-token', (req, res) => userController.verifyToken(req, res));
router.post('/membership/register', uploadMiddleware, (req, res) => userController.uploadIdentityCard(req, res));
router.get('/profile', (req, res) => userController.getUserProfile(req, res));
router.put('/profile', uploadMiddleware, (req, res) => userController.updateProfileData(req, res));
router.get("/membership-card/download", userController.downloadMembershipCard);
router.get("/identity-card/download", userController.downloadIdentityCard);

export default router;
