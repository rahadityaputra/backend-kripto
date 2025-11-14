import { PrismaClient } from '@prisma/client';
import { rsaDecrypt, rsaDecryptFields, rsaEncrypt } from '../utils/rsa.utils';
import JWTUtils from '../utils/jwt.utils';
import { logger } from '../config/logger.config';
import { UserMetadata } from '@supabase/supabase-js';
import { SupabaseStorageService } from './supabase.service';
import { createEncryptedMemberCardStegoBuffer, createEncryptedPayload, createMemberCardBuffer, decryptFile, encryptFile } from '../utils/utils';
import { AESUtils } from '../utils/aes.utils';
import { UserNotFoundError } from '../utils/errors';

const prisma = new PrismaClient();
interface VerifyRefreshTokenResponse {
    status: boolean;
    message: string;
    data?: {
        accessToken: string;
        refreshToken: string;
    };
    error?: string;
};

const ENCRYPTED_FIELDS = ['email', 'username'];
const PROFILE_ENCRYPTED_FIELDS = [
    "fullname",
    "address",
    "birthDate",
    "avatarUrl"
];

export class UserService {
    async setMemberUser(userId: number): Promise<UserMetadata> {
        try {
            const user = await prisma.user.update({
                where: { id: userId },
                data: { isMemberUser: true }
            });

            if (!user) {
                logger.warn(`Failed to set member user for user ID: ${userId}`);
                throw new UserNotFoundError('User not found');
            }

            const decryptedUser = this.decryptUserData(user);

            logger.info(`Successfully set member user for user ID: ${userId}`);

            return user;
        } catch (error) {
            logger.error(`Set member user error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }

    async verifyRefreshToken(refreshToken: string): Promise<VerifyRefreshTokenResponse> {
        try {
            const decoded = JWTUtils.verifyRefreshToken(refreshToken);

            const accessToken = JWTUtils.generateAccessToken({
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role
            });

            const newRefreshToken = JWTUtils.generateRefreshToken({
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role
            });

            return {
                status: true,
                message: 'Refresh token is valid',
                data: {
                    accessToken,
                    refreshToken: newRefreshToken
                }
            };
        } catch (error) {
            logger.error(`Refresh token verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                status: false,
                message: 'Invalid refresh token',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }


    private decryptUserData<T extends Record<string, any>>(user: T): Omit<T, 'password'> {
        const decryptedUser = rsaDecryptFields(user, ENCRYPTED_FIELDS as (keyof T)[]);
        const { password, ...userWithoutPassword } = decryptedUser;
        return userWithoutPassword;
    }

    private decryptProfileData<T extends Record<string, any>>(
        profile: T
    ): T {
        if (!profile) return profile;

        const decryptedProfile = rsaDecryptFields(
            profile,
            PROFILE_ENCRYPTED_FIELDS as (keyof T)[]
        );

        return decryptedProfile;
    }




    async getUserProfile(userId: number) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    email: true
                }
            })


            const profileUser = await prisma.profile.findUnique({
                where: { userId: userId }
            });

            const isMemberUser = await this.isMemberUser(userId);

            if (!profileUser) {
                logger.warn(`User not found for User ID: ${userId}`);
                throw new UserNotFoundError('User not found');
            }



            logger.info("fullname encrypted: " + profileUser?.fullname);
            logger.info("address encrypted: " + profileUser?.address);

            const decryptedUserProfile = {
                fullname: rsaDecrypt(profileUser?.fullname || ''),
                email: rsaDecrypt(user?.email || ""),
                address: rsaDecrypt(profileUser?.address || ''),
                birthDate: rsaDecrypt(profileUser?.birthDate || ''),
                avatarUrl: rsaDecrypt(profileUser.avatarUrl || '')
            }

            logger.info(`Successfully decrypted profile for User ID: ${userId}`);
            logger.info(decryptedUserProfile);


            const data = { ...decryptedUserProfile, gender: profileUser.gender, isMemberUser, lastUpdated: profileUser.updatedAt };

            if (isMemberUser) {
                const identityCardUrl = await SupabaseStorageService.getIdentityCardUrl(userId.toString());
                const membershipCardURL = await SupabaseStorageService.getMembershipCardUrl(userId.toString());
                Object.assign(data, { membershipCardURL, identityCardUrl });
            }

            return {
                status: true,
                message: 'User profile retrieved successfully',
                data
            };
        } catch (error) {
            logger.error(`Get profile error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                status: false,
                message: 'Failed to retrieve User profile',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }


    async isMemberUser(userId: number): Promise<boolean> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { isMemberUser: true }
            });

            if (!user) {
                logger.warn(`User not found for User ID: ${userId}`);
                throw new UserNotFoundError('User not found');
            }

            logger.info(`isMemberUser for User ID ${userId}: ${user.isMemberUser}`);
            return user.isMemberUser;
        } catch (error) {
            logger.error(`isMemberUser check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }

    async getUserFullName(userId: number): Promise<string> {
        try {
            const profileUser = await prisma.profile.findUnique({
                where: { userId: userId },
                select: { fullname: true }
            });

            if (!profileUser) {
                logger.warn(`Profile not found for User ID: ${userId}`);
                throw new Error('Profile not found');
            }

            const decryptedFullName = rsaDecrypt(profileUser.fullname || '');

            logger.info(`Successfully retrieved and decrypted fullname for User ID: ${userId}`);
            return decryptedFullName;
        } catch (error) {
            logger.error(`Get user fullname error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }

    async updateMembershipCardUrl(userId: number, url: string): Promise<void> {
        try {
            await prisma.user.update({
                where: { id: userId },
                data: { membershipCardUrl: url }
            });

            logger.info(`Successfully updated membership card URL for User ID: ${userId}`);
        } catch (error) {
            logger.error(`Update membership card URL error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }


    async updateProfileData(userId: number, profileData: any, avatarFile?: Buffer) {
        try {
            if (avatarFile) {
                const avatarUrl = await SupabaseStorageService.uploadAvatarImage(avatarFile, `${userId}-avatar.png`);
                console.log(avatarUrl)
                const newAvatarUrl = avatarUrl + `?t=${new Date().getTime()}`;

                profileData = { ...profileData, avatarUrl: newAvatarUrl };
            }

            const { email, ...otherProfileData } = profileData;

            const encryptedData: any = { ...otherProfileData };
            for (const field of PROFILE_ENCRYPTED_FIELDS) {
                if (profileData[field]) {
                    encryptedData[field] = rsaEncrypt(profileData[field]);
                }
            }

            logger.info("encryptedData", encryptedData);

            const profile = await prisma.profile.update({
                where: { userId: userId },
                data: encryptedData
            });

            const userData = await prisma.user.update({
                where: {
                    id: userId
                },
                data: {
                    email: rsaEncrypt(profileData.email)
                }
            })

            const response = {
                id: profile.id,
                userId: userId,
                fullname: rsaDecrypt(profile.fullname),
                birthDate: rsaDecrypt(profile.birthDate),
                gender: profile.gender,
                address: rsaDecrypt(profile.address),
                avatarUrl: rsaDecrypt(profile.avatarUrl),
                createdAt: profile.createdAt,
                updatedAt: profile.updatedAt
            }

            logger.info(`Successfully updated profile data for User ID: ${userId}`);

            return {
                status: true,
                message: 'Update user profile successfully',
                data: response
            };
        } catch (error) {
            logger.error(`Update profile data error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }

    public async processIdentityAndCreateMembership(userId: number, identityFileBuffer: Buffer) {
        await this.handleIdentityCardUpload(userId, identityFileBuffer);
        const { membershipCardURL, membershipCardStegoURL } = await this.generateAndUploadMembershipCards(userId);
        await this.updateMembershipCardUrl(userId, membershipCardURL);
        const memberUser = await this.setMemberUser(userId);
        return {
            membershipCardUrl: membershipCardStegoURL,
            ...memberUser
        };
    }

    private async handleIdentityCardUpload(userId: number, fileBuffer: Buffer) {
        logger.info(`Processing identity card upload for user ID: ${userId}`);

        const encryptedIdentityCardBuffer = encryptFile(fileBuffer);
        const identityCardURL = await SupabaseStorageService.uploadEncryptedImage(encryptedIdentityCardBuffer, userId);

        if (!identityCardURL) {
            logger.error(`Failed to upload identity card for user ID: ${userId}`);
            throw new Error('Failed to upload identity card');
        }

        logger.info(`Successfully uploaded identity card for user ID: ${userId}`);
    }

    private async generateAndUploadMembershipCards(userId: number) {

        const fullname = await this.getUserFullName(userId);
        const encryptedPayload = createEncryptedPayload(userId);
        const membershipCardBuffer = await createMemberCardBuffer(userId, fullname);

        const encryptedMembershipCardBuffer = encryptFile(membershipCardBuffer);
        const encryptedMembershipCardStegoBuffer = await createEncryptedMemberCardStegoBuffer(membershipCardBuffer, encryptedPayload);

        const filename = `stegano-membership-card.png`;
        const membershipCardURL = await SupabaseStorageService.uploadBufferAsImage(encryptedMembershipCardBuffer, userId.toString(), 'original-membership-card.png');
        const membershipCardStegoURL = await SupabaseStorageService.uploadBufferAsImage(encryptedMembershipCardStegoBuffer, userId.toString(), filename);

        if (!membershipCardURL || !membershipCardStegoURL) {
            logger.error(`Failed to upload one or more membership cards for user ID: ${userId}`);
            throw new Error('Failed to upload membership cards');
        }

        return { membershipCardURL, membershipCardStegoURL };
    }

    async downloadMembershipCardBuffer(userId: number): Promise<Buffer> {
        try {
            const filename = `${userId}/stegano-membership-card.png`;
            const fileBlob = await SupabaseStorageService.downloadFile(filename);
            const arrayBuffer = await fileBlob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const key = Buffer.from(process.env.AES_KEY!, "base64");
            const stegoBufferEncryped = AESUtils.decryptBuffer(buffer, key);    
            return stegoBufferEncryped;
        } catch (error) {
            logger.info(error);
            throw error;
        }
    }

    async downloadIdentityCardBuffer(userId: number): Promise<Buffer> {
        const filename = `${userId}-identity-card.png`;
        const fileBlob = await SupabaseStorageService.downloadIdentityCard(filename);
        const arrayBuffer = await fileBlob.arrayBuffer();
        const encryptedBuffer = Buffer.from(arrayBuffer);
        const decryptedBuffer = decryptFile(encryptedBuffer);
        return decryptedBuffer;
    }




}