"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const logger_config_1 = require("../config/logger.config");
const rsa_utils_1 = require("../utils/rsa.utils");
const jwt_utils_1 = __importDefault(require("../utils/jwt.utils"));
const client_1 = require("@prisma/client");
const stego_utils_1 = require("../utils/stego.utils");
const superEncryption_utils_1 = require("../utils/superEncryption.utils");
const prisma = new client_1.PrismaClient();
class AuthController {
    constructor() {
        this.authService = new auth_service_1.AuthService();
    }
    async verifyRefreshToken(req, res) {
        try {
            const { refreshToken } = req.body;
            logger_config_1.logger.info(`Refresh token verification request received`);
            const result = await this.authService.verifyRefreshToken(refreshToken);
            return res.status(result.status ? 200 : 401).json(result);
        }
        catch (error) {
            logger_config_1.logger.error(`Refresh token verification controller error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async register(req, res) {
        try {
            const userData = req.body;
            userData.username = userData.email.split('@')[0];
            logger_config_1.logger.info(`Registration request received for email: ${userData.email}`);
            const result = await this.authService.register(userData);
            return res.status(result.status ? 201 : 400).json(result);
        }
        catch (error) {
            logger_config_1.logger.error(`Registration controller error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async verifyEmail(req, res) {
        try {
            const { userId, code } = req.body;
            logger_config_1.logger.info(`Email verification request received for user ID: ${userId}`);
            const result = await this.authService.verifyEmail(userId, code);
            return res.status(result.status ? 200 : 400).json(result);
        }
        catch (error) {
            logger_config_1.logger.error(`Email verification controller error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async login(req, res) {
        try {
            const loginData = req.body;
            logger_config_1.logger.info(`Login request received for email: ${loginData.email}`);
            const result = await this.authService.login(loginData);
            return res.status(result.status ? 200 : 401).json(result);
        }
        catch (error) {
            logger_config_1.logger.error(`Login controller error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async verifyLogin(req, res) {
        try {
            const { userId, code } = req.body;
            logger_config_1.logger.info(`Login verification request received for user ID: ${userId}`);
            const result = await this.authService.verifyLogin(userId, code);
            return res.status(result.status ? 200 : 400).json(result);
        }
        catch (error) {
            logger_config_1.logger.error(`Login verification controller error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async loginByCard(req, res) {
        try {
            if (!req.file)
                return res.status(400).json({ status: false, message: 'card image required' });
            const extractedEncrypted = await (0, stego_utils_1.extractLSB)(req.file.buffer);
            const payloadJson = (0, superEncryption_utils_1.superDecrypt)(extractedEncrypted); // returns JSON string
            const payload = JSON.parse(payloadJson);
            // verify token inside payload
            const verified = jwt_utils_1.default.verifyCardToken(payload.token);
            if (!verified || !verified.userId) {
                return res.status(401).json({ status: false, message: 'invalid card token' });
            }
            const user = await prisma.user.findUnique({
                where: {
                    id: verified.userId
                }
            });
            if (!user) {
                return {
                    message: "error"
                };
            }
            const accessToken = jwt_utils_1.default.generateAccessToken({
                userId: verified,
                email: (0, rsa_utils_1.rsaDecrypt)(user === null || user === void 0 ? void 0 : user.email),
                role: user.role
            });
            const refreshToken = jwt_utils_1.default.generateRefreshToken({
                userId: user.id,
                email: (0, rsa_utils_1.rsaDecrypt)(user.email),
                role: user.role
            });
            return res.json({
                status: true,
                message: 'Login by card successful',
                data: { userId: user.id, accessToken, refreshToken }
            });
        }
        catch (err) {
            console.error(err);
            return res.status(400).json({ status: false, message: 'failed to login by card', error: err.message });
        }
    }
}
exports.AuthController = AuthController;
