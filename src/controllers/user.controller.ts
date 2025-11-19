import { Request, Response } from 'express';
import { logger } from '../config/logger.config';
import { UserService } from '../services/user.service';
import { BadRequestError, UnauthorizedError } from '../utils/errors';

interface UserRequest extends Request {
    user?: {
        userId: number;
        email: string;
    };
}

export class UserController {
    private userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    async verifyToken(req: Request, res: Response) {
        try {

            const result = {
                status: true,
                message: 'Token is valid'
            }
            return res.status(result.status ? 200 : 400).json(result);

        } catch (error) {
            logger.error(`Registration controller error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async uploadIdentityCard(req: UserRequest, res: Response) {
        const userId = req.user?.userId;
        if (!userId) {
            throw new UnauthorizedError('Unauthorized');
        }

        const file = req.file;
        if (!file) {
            throw new BadRequestError('No file uploaded');
        }

        const resultData = await this.userService.processIdentityAndCreateMembership(
            userId,
            file.buffer
        );

        logger.info(`Successfully processed identity card and created membership for user ID: ${userId}`);
        return res.status(200).json({
            data: resultData,
            status: true,
            message: 'Identity card uploaded successfully'
        });
    }
   
    async getUserProfile(req: UserRequest, res: Response) {
        const userId = req.user?.userId;
        if (!userId) {
            throw new UnauthorizedError('Unauthorized');
        }

        logger.info(`Fetching user profile for user ID: ${userId}`);

        const result = await this.userService.getUserProfile(userId);

        return res.status(result.status ? 200 : 400).json(result);
    }


    async updateProfileData(req: UserRequest, res: Response) {
        const userId = req.user?.userId;
        if (!userId) {
            throw new UnauthorizedError('Unauthorized');
        }

        const profileData = req.body;
        const file = req.file;
        const avatarUploadBuffer = file?.buffer;

        logger.info(`Updating profile data for user ID: ${userId}`);

        const result = await this.userService.updateProfileData(userId, profileData, avatarUploadBuffer);

        return res.status(result.status ? 200 : 400).json(result);
    }

    async downloadMembershipCard(req: UserRequest, res: Response) {
        const userId = req.user?.userId;

        if (!userId) {
            throw new UnauthorizedError('Unauthorized');
        }

        const buffer = await this.userService.downloadMembershipCardBuffer(userId);

        res.setHeader("Content-Type", "image/png");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=membership-card-${userId}.png`
        );

        return res.send(buffer);
    }

    async downloadIdentityCard(req: UserRequest, res: Response) {
        const userId = req.user?.userId;

        if (!userId) {
            throw new UnauthorizedError('Unauthorized');
        }

        const buffer = await this.userService.downloadIdentityCardBuffer(userId);

        res.setHeader("Content-Type", "image/png");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=identity-card.png`
        );

        return res.send(buffer);
    }

    async getMembershipStatus(req: UserRequest, res: Response) {
        const userId = req.user?.userId;

        if (!userId) {
            throw new UnauthorizedError('Unauthorized');
        }

        const isMember = await this.userService.isMemberUser(userId);

        return res.status(200).json({
            status: true,
            data: {
                isMember
            }
        });
    }


}
