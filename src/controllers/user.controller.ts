import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UserLogin, UserRegister } from '../types/auth.types';
import { logger } from '../config/logger.config';
import { SupabaseStorageService } from '../services/supabase.service';
import CanvasUtils from '../utils/canvas,utils';
import { UserService } from '../services/user.service';
import { superEncrypt } from '../utils/superEncryption.utils';

import JWTUtils from '../utils/jwt.utils';
import { embedDCT8x8 } from '../utils/stego.utils';
import { AESUtils } from '../utils/aes.utils';
import { createCanvas, ImageData } from "canvas";

interface UserRequest extends Request {
    user?: {
        userId: number;
        email: string;
        role: string;
    };
}

export class UserController {
    private authService: AuthService;
    private userService: UserService;

    constructor() {
        this.authService = new AuthService();
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

    async uploadIdentityCard(req: UserRequest, res: Response) {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                return res.status(401).json({
                    status: false,
                    message: 'Unauthorized'
                });
            }
            const file = req.file;

            if (!file) {
                return res.status(400).json({
                    status: false,
                    message: 'No file uploaded'
                });
            }
            

            logger.info(`Processing identity card upload for user ID: ${userId}`);

            const cardToken = JWTUtils.generateCardToken(userId, 60*60*24*7); 
            const payload = JSON.stringify({ userId, token: cardToken, iat: Date.now() });
            
            const encrypted = superEncrypt(payload); 
            const identityBuffer = file.buffer;
            const fullname = await this.userService.getUserFullName(userId);
            const fileMembershipCardBuffer = await CanvasUtils.createMemberCard({ memberId: userId.toString(), memberName: fullname });
            
            const stegoBuffer = await embedDCT8x8(fileMembershipCardBuffer, encrypted);

            const key = Buffer.from(process.env.AES_KEY!, "base64");

            const encryptedIdentityCardBuffer = AESUtils.encryptBuffer(identityBuffer, key);
        
            const imageUrl = await SupabaseStorageService.uploadEncryptedImage(encryptedIdentityCardBuffer, userId);
            
            const filename = `stegano-membership-card.png`;
            const steganoUrl = await SupabaseStorageService.uploadBufferAsImage(stegoBuffer, userId.toString(), filename);

            const membershipCardUrl = await SupabaseStorageService.uploadBufferAsImage(fileMembershipCardBuffer, userId.toString(), 'original-membership-card.png');

            
            if (!imageUrl) {
                logger.error(`Failed to upload identity card for user ID: ${userId}`);
                return res.status(500).json({
                    status: false,
                    message: 'Failed to upload identity card'
                });
            }

            const memberUser = await this.userService.setMemberUser(userId);
            await this.userService.updateMembershipCardUrl(userId, membershipCardUrl);

            logger.info(`Successfully uploaded identity card for user ID: ${userId}`);
            return res.status(200).json({
                data : {
                    membershipCardUrl : steganoUrl,
                    ...memberUser
                },
                status: true,
                message: 'Identity card uploaded successfully'
            
            });
        } catch (error) {
            console.log(error);
            logger.error(`Identity card upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }


//     matToPngBuffer(mat: cv.Mat): Buffer {
//         const canvas = createCanvas(mat.cols, mat.rows);
//         const ctx = canvas.getContext("2d");

//         const imgData = new Uint8ClampedArray(mat.data);
//         const imageData = new ImageData(imgData, mat.cols, mat.rows);

//         ctx.putImageData(imageData, 0, 0);

//         return canvas.toBuffer("image/png");
// }


    async getUserProfile(req: UserRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    status: false,
                    message: 'Unauthorized'
                });
            }

            logger.info(`Fetching user profile for user ID: ${userId}`);

            const result = await this.userService.getUserProfile(userId);

            return res.status(result.status ? 200 : 400).json(result);

        } catch (error) {
            logger.error(`Get user profile controller error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }


    async updateProfileData(req: UserRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    status: false,
                    message: 'Unauthorized'
                });
            }

            const profileData = req.body;
            const file = req.file;
            const avatarUploadBuffer = file?.buffer;

            logger.info(`Updating profile data for user ID: ${userId}`);

            const result = await this.userService.updateProfileData(userId, profileData, avatarUploadBuffer);

            return res.status(result.status ? 200 : 400).json(result);

        } catch (error) {
            logger.error(`Update profile data controller error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async downloadMembershipCard(req: UserRequest, res: Response) {
        try {
            const userId = req.user?.userId; // pastikan JWT middleware sudah set req.user
      
            if (!userId) {
              return res.status(401).json({
                status: false,
                message: "Unauthorized",
              });
            }
      
            // path penyimpanan membership card (harus sama dengan upload)
            const filename = `${userId}/stegano-membership-card.png`;
      
            const fileBlob = await SupabaseStorageService.downloadFile(filename);
            const arrayBuffer = await fileBlob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
      
            res.setHeader("Content-Type", "image/png");
            res.setHeader(
              "Content-Disposition",
              `attachment; filename=membership-card-${userId}.png`
            );
      
            return res.send(buffer);
          } catch (error) {
            console.log(error);
            return res.status(500).json({
              status: false,
              message: "Failed to download membership card",
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
    }
    
}