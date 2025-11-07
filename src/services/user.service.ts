import { PrismaClient } from '@prisma/client';
import { rsaDecrypt, rsaDecryptFields, rsaEncrypt } from '../utils/rsa.utils';
import JWTUtils from '../utils/jwt.utils';
import { logger } from '../config/logger.config';
import { UserMetadata } from '@supabase/supabase-js';
import { SupabaseStorageService } from './supabase.service';

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
                throw new Error('User not found');
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
      
        // Dekripsi field-field sensitif
        const decryptedProfile = rsaDecryptFields(
          profile,
          PROFILE_ENCRYPTED_FIELDS as (keyof T)[]
        );
      
        return decryptedProfile;
      }

    


    async getUserProfile(userId: number) {
        try {
            console.log("user dengan id = " , userId , " akan mendapatkan user profile")
            const user = await prisma.user.findUnique({
                where: {id : userId},
                select : {
                    email: true
                }
            })

            console.log("data user dari database yang masih dienkripsi = ", user)

            const profileUser = await prisma.profile.findUnique({
                where: { userId: userId }
            });

            console.log("data profile dari database yang masih dienkripsi = ", profileUser)

            const isMemberUser = await this.isMemberUser(userId);

            if (!profileUser) {
                logger.warn(`User not found for User ID: ${userId}`);
                throw new Error('User not found');
            }

        

            logger.info("fullname encrypted: " + profileUser?.fullname);
            logger.info("address encrypted: " + profileUser?.address);

            const decryptedUserProfile = {
                fullname: rsaDecrypt(profileUser?.fullname || ''),
                email : rsaDecrypt(user?.email || ""),
                address: rsaDecrypt(profileUser?.address || ''),
                birthDate: rsaDecrypt(profileUser?.birthDate || ''),
            }

            logger.info(`Successfully decrypted profile for User ID: ${userId}`);
            logger.info(decryptedUserProfile);    

            
            const data = {...decryptedUserProfile, avatar: profileUser.avatarUrl, gender: profileUser.gender, isMemberUser, lastUpdated: profileUser.updatedAt};
            
            if (isMemberUser) {
                console.log("user adalah member")
                const identityCardUrl = await SupabaseStorageService.getIdentityCardUrl(userId.toString());
                console.log("identity card file url sudah bisa didapatkan");


                const memberUser = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { membershipCardUrl: true }
                });


                const membershipCardURL = memberUser?.membershipCardUrl || null;
                Object.assign(data, { membershipCardURL,identityCardUrl });
            }

            return {
                status: true,
                message: 'User profile retrieved successfully',
                data
            };
        } catch (error) {
            console.log(error)
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
                throw new Error('User not found');
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
                profileData = {...profileData, avatarUrl};    
            }


            const {email, ...otherProfileData} = profileData;
            console.log(otherProfileData);
            

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
                where : {
                    id : userId
                },
                data : {
                    email: rsaEncrypt(profileData.email)
                }
            })

            


            const response = {
                id: profile.id,
                userId: userId,
                fullname: rsaDecrypt(profile.fullname),
                birthDate: rsaDecrypt(profile.birthDate),
                gender: profile.gender,
                address : rsaDecrypt(profile.address),
                avatarUrl: profile.avatarUrl,
                createdAt: profile.createdAt,
                updatedAt: profile.updatedAt
            }

            logger.info(`Successfully updated profile data for User ID: ${userId}`);

            return {
                status: true,
                message: 'Update user profile successfully',
                data : response
            };
        } catch (error) {
            logger.error(`Update profile data error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }

   

}