"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)();
const router = (0, express_1.Router)();
const authController = new auth_controller_1.AuthController();
router.post('/register', auth_middleware_1.validateAuthInput, (req, res) => authController.register(req, res));
router.post('/verify-email', (req, res) => authController.verifyEmail(req, res));
router.post('/verify-refresh-token', (req, res) => authController.verifyRefreshToken(req, res));
router.post('/login', auth_middleware_1.validateAuthInput, (req, res) => authController.login(req, res));
router.post('/verify-login', (req, res) => authController.verifyLogin(req, res));
router.post('/login-with-card', upload.single('membershipCard'), (req, res) => authController.loginByCard(req, res));
exports.default = router;
