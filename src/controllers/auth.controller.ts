import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UserLogin, UserRegister } from '../types/auth.types';
import { logger } from '../config/logger.config';
import { BadRequestError } from '../utils/errors';

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

    async loginByCard(req: Request, res: Response) {
        if (!req.file) {
            throw new BadRequestError('Card image required');
        }

        const result = await this.authService.handleCardLogin(req.file.buffer);
        return res.status(result.status ? 200 : 500).json(result);
    }


}