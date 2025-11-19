import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.config';
import { UserService } from '../services/user.service';

interface requestWithUser extends Request {
    user?: {
        userId: number;
        email: string;
    };
}

const userService = new UserService()
export const membershipMiddleware = (req: requestWithUser, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        const isMemberUser =userService.isMemberUser(userId!);
        if (!isMemberUser) {
            logger.warn(`Access denied for non-member user ID: ${userId}`);
            return res.status(403).json({
                status: false,
                message: 'Access denied. Membership required.'
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