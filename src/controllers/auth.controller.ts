import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UserLogin, UserRegister } from '../types/auth.types';
import { logger } from '../config/logger.config';
import { rsaDecrypt } from '../utils/rsa.utils';
import JWTUtils from '../utils/jwt.utils';
import { PrismaClient } from '@prisma/client';
import { extractLSB } from '../utils/stego.utils';
import { superDecrypt } from '../utils/superEncryption.utils';


const prisma = new PrismaClient();

export class AuthController {
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
    }

    async verifyRefreshToken(req: Request, res: Response) {
        try {
            const { refreshToken } = req.body;
            logger.info(`Refresh token verification request received`);

            const result = await this.authService.verifyRefreshToken(refreshToken);
            return res.status(result.status ? 200 : 401).json(result);
        } catch (error) {
            logger.error(`Refresh token verification controller error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async register(req: Request, res: Response) {
        try {
            const userData: UserRegister = req.body;
            userData.username = userData.email.split('@')[0];
            logger.info(`Registration request received for email: ${userData.email}`);

            const result = await this.authService.register(userData);

            return res.status(result.status ? 201 : 400).json(result);
        } catch (error) {
            logger.error(`Registration controller error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async verifyEmail(req: Request, res: Response) {
        try {
            const { userId, code } = req.body;
            logger.info(`Email verification request received for user ID: ${userId}`);

            const result = await this.authService.verifyEmail(userId, code);
            return res.status(result.status ? 200 : 400).json(result);
        } catch (error) {
            logger.error(`Email verification controller error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async login(req: Request, res: Response) {
        try {
            const loginData: UserLogin = req.body;
            logger.info(`Login request received for email: ${loginData.email}`);

            const result = await this.authService.login(loginData);
            return res.status(result.status ? 200 : 401).json(result);
        } catch (error) {
            logger.error(`Login controller error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async verifyLogin(req: Request, res: Response) {
        try {
            const { userId, code } = req.body;
            logger.info(`Login verification request received for user ID: ${userId}`);

            const result = await this.authService.verifyLogin(userId, code);
            return res.status(result.status ? 200 : 400).json(result);
        } catch (error) {
            logger.error(`Login verification controller error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }


    async loginByCard(req: Request, res: Response) {
        try {
            if (!req.file) return res.status(400).json({ status: false, message: 'card image required' });
            const extractedEncrypted = await extractLSB(req.file.buffer);
            const payloadJson = superDecrypt(extractedEncrypted); // returns JSON string
            const payload = JSON.parse(payloadJson);

            // verify token inside payload
            const verified = JWTUtils.verifyCardToken(payload.token);
            if (!verified || !verified.userId) {
                return res.status(401).json({ status: false, message: 'invalid card token' });
            }

            const user = await prisma.user.findUnique({
                where: {
                    id: verified.userId
                }
            })

            if (!user) {
                return {
                    message: "error"
                }
            }

            const accessToken = JWTUtils.generateAccessToken({
                userId: user.id,
                email: rsaDecrypt(user?.email),
                role: user.role
            });

            const refreshToken = JWTUtils.generateRefreshToken({
                userId: user.id,
                email: rsaDecrypt(user.email),
                role: user.role
            });

            return res.json({
                status: true,
                message: 'Login by card successful',
                data: { user: user, accessToken, refreshToken }
            });

        } catch (err: any) {
            console.error(err);
            return res.status(400).json({ status: false, message: 'failed to login by card', error: err.message });
        }
    }


}