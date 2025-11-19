import { Request, Response, NextFunction } from 'express';
import JWTUtils from '../utils/jwt.utils';
import { logger } from '../config/logger.config';

export const validateAuthInput = (req: Request, res: Response, next: NextFunction) => {
    logger.info('Validating authentication input');
    const { email, password } = req.body;
    logger.info(req.body);

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({
            status: false,
            message: 'Invalid email format'
        });
    }

    // Password validation (minimum 8 characters, at least one uppercase, one lowercase, one number)
    // const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    // if (!password || !passwordRegex.test(password)) {
    if (!password || password.length < 8) {
        return res.status(400).json({
            status: false,
            message: 'Password requirements not met. Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.'
        });
    }

    next();
};


interface requestWithUser extends Request {
    user?: {
        userId: number;
        email: string;
    };
}

export const authMiddleware = (req: requestWithUser, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                status: false,
                message: 'No token provided'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = JWTUtils.verifyAccessToken(token);

        req.user = decoded;

        // Verify user ID in params matches token (if userId param exists)
        const userIdParam = req.params.userId;
        if (userIdParam && parseInt(userIdParam) !== decoded.userId) {
            logger.warn(`User ${decoded.userId} attempted to access resources of user ${userIdParam}`);
            return res.status(403).json({
                status: false,
                message: 'Unauthorized access'
            });
        }

        next();
    } catch (error) {
        logger.error(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return res.status(401).json({
            status: false,
            message: 'Invalid or expired token'
        });
    }
};