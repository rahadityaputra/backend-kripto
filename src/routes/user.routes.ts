import { Router } from 'express';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { UserController } from '../controllers/user.controller';
import multer from 'multer';
const router = Router();
const userController = new UserController();
const upload = multer();

router.get('/profile', (req, res) => userController.getUserProfile(req, res));
router.get("/identity-card/download", (req, res) => userController.downloadIdentityCard(req, res));
router.get("/membership-card/download", (req, res) => userController.downloadMembershipCard(req, res));
router.get("/membership/status", (req, res) => userController.getMembershipStatus(req, res));
router.post('/verify-token', (req, res) => userController.verifyToken(req, res));
router.post('/membership/register', uploadMiddleware, (req, res) => userController.uploadIdentityCard(req, res));
router.put('/profile', upload.single("avatarImage"), (req, res) => userController.updateProfileData(req, res));

export default router;
