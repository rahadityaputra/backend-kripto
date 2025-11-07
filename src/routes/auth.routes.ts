import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateAuthInput, authMiddleware } from '../middleware/auth.middleware';
import multer from 'multer';
const upload = multer();
const router = Router();
const authController = new AuthController();

router.post('/register', validateAuthInput, (req, res) => authController.register(req, res));
router.post('/verify-email', (req, res) => authController.verifyEmail(req, res));
router.post('/verify-refresh-token', (req, res) => authController.verifyRefreshToken(req, res));
router.post('/login', validateAuthInput, (req, res) => authController.login(req, res));
router.post('/verify-login', (req, res) => authController.verifyLogin(req, res));
router.post('/login-with-card', upload.single('membershipCard'), (req, res) => authController.loginByCard(req, res));

export default router;