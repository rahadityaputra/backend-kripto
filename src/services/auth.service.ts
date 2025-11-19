import { PrismaClient } from '@prisma/client';
import { UserLogin, UserRegister, AuthResponse } from '../types/auth.types';
import { ScryptUtils } from '../utils/scrypt.utils';
import JWTUtils from '../utils/jwt.utils';
import { logger } from '../config/logger.config';
import { rsaDecrypt, rsaDecryptFields, rsaEncrypt, rsaEncryptFields } from '../utils/rsa.utils';
import AvatarUtils from '../utils/avatar.utils';
import { SupabaseStorageService } from './supabase.service';
import { superDecrypt } from '../utils/superEncryption.utils';
import { InvalidCardDataError, InvalidTokenError, UserNotFoundError } from '../utils/errors';

import { extractEMD } from '../utils/stego2.utils';

const prisma = new PrismaClient();


const verificationCodes = new Map<number, string>();


const ENCRYPTED_FIELDS = ['email', 'username'];

export class AuthService {

    async verifyRefreshToken(refreshToken: string): Promise<AuthResponse> {
        try {
            const decoded = JWTUtils.verifyRefreshToken(refreshToken);

            const accessToken = JWTUtils.generateAccessToken({
                userId: decoded.userId,
                email: decoded.email
            });

            const newRefreshToken = JWTUtils.generateRefreshToken({
                userId: decoded.userId,
                email: decoded.email
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

    async register(userData: UserRegister): Promise<AuthResponse> {
        try {


            logger.info('Registering user with data: ' + JSON.stringify(userData));
            const allUsers = await prisma.user.findMany({
                select: { id: true, email: true }
            });

            const existingUser = allUsers.find((user: any) => {
                try {
                    return rsaDecrypt(user.email) === userData.email;
                } catch {
                    return false;
                }
            });

            if (existingUser) {
                logger.warn(`Registration attempt with existing email: ${userData.email}`);
                return {
                    status: false,
                    message: 'Email already registered'
                };
            }

            const hashedPassword = await ScryptUtils.hashPassword(userData.password);
            const encryptedData = rsaEncryptFields<UserRegister>(userData, ENCRYPTED_FIELDS as (keyof UserRegister)[]);
            const fullname_encrypted = rsaEncrypt(userData.fullname);
            const dateOfBirth_encrypted = rsaEncrypt(userData.dateOfBirth);
            const address_encrypted = rsaEncrypt(userData.address);
            const avatarBuffer = await AvatarUtils.generateAvatarImageFile(userData.fullname);
            
            const user = await prisma.user.create({
                data: {
                    email: encryptedData.email,
                    username: encryptedData.username,
                    password: hashedPassword
                }
            });
            
            const profileAvatarUrl = await SupabaseStorageService.uploadAvatarImage(avatarBuffer, `${user.id}_avatar.png`);
            const encryptedAvatarURL = rsaEncrypt(profileAvatarUrl!);

            await prisma.profile.create({
                data: {
                    userId: user.id,
                    fullname: fullname_encrypted,
                    birthDate: dateOfBirth_encrypted,
                    address: address_encrypted,
                    gender: userData.gender,
                    avatarUrl: encryptedAvatarURL as string
                }
            })

            const decryptedUser = this.decryptUserData(user);

            const accessToken = JWTUtils.generateAccessToken({
                userId: user.id,
                email: rsaDecrypt(user.email)
            });

            const refreshToken = JWTUtils.generateRefreshToken({
                userId: user.id,
                email: rsaDecrypt(user.email)
            });

            logger.info(`User registered successfully with ID: ${user.id}`);
            return {
                status: true,
                message: 'Registration successful.',
                data: {
                    user: decryptedUser,
                    accessToken,
                    refreshToken
                }
            };

        } catch (error) {
            logger.error(`Registration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                status: false,
                message: 'Registration failed',

                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async login(loginData: UserLogin): Promise<AuthResponse> {
        try {
            
            const allUsers = await prisma.user.findMany();
            const user = allUsers.find(u => {
                try {
                    return rsaDecrypt(u.email) === loginData.email;
                } catch {
                    return false;
                }
            });

            if (!user) {
                logger.warn(`Login attempt with non-existent email: ${loginData.email}`);
                return {
                    status: false,
                    message: 'Invalid email or password'
                };
            }

            const validPassword = await ScryptUtils.verifyPassword(loginData.password, user.password);
            if (!validPassword) {
                logger.warn(`Failed login attempt for user ID: ${user.id}`);
                return {
                    status: false,
                    message: 'Invalid email or password'
                };
            }

            const decryptedUser = this.decryptUserData(user);
            const accessToken = JWTUtils.generateAccessToken({
                userId: user.id,
                email: rsaDecrypt(user.email)
            });

            const refreshToken = JWTUtils.generateRefreshToken({
                userId: user.id,
                email: rsaDecrypt(user.email)
            });


            return {
                status: true,
                message: 'Login successful.',
                data: {
                    user: decryptedUser,
                    accessToken,
                    refreshToken
                }
            };
        } catch (error) {
            logger.error(`Login error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                status: false,
                message: 'Login failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private decryptUserData<T extends Record<string, any>>(user: T): Omit<T, 'password'> {
        const decryptedUser = rsaDecryptFields(user, ENCRYPTED_FIELDS as (keyof T)[]);
        const { password: _, ...userWithoutPassword } = decryptedUser;
        return userWithoutPassword;
    }

    async verifyLogin(userId: number, code: string): Promise<AuthResponse> {
        try {
            const storedCode = verificationCodes.get(userId);

            if (!storedCode) {
                logger.warn(`Login verification attempt with no stored code for user ID: ${userId}`);
                return {
                    status: false,
                    message: 'Verification code not found'
                };
            }

            if (storedCode !== code) {
                logger.warn(`Invalid login verification code used for user ID: ${userId}`);
                return {
                    status: false,
                    message: 'Invalid verification code'
                };
            }

            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                logger.error(`User not found during login verification for ID: ${userId}`);
                return {
                    status: false,
                    message: 'User not found'
                };
            }

            verificationCodes.delete(userId);
            logger.info(`Login verified successfully for user ID: ${userId}`);

            const decryptedUser = this.decryptUserData(user);
            const accessToken = JWTUtils.generateAccessToken({
                userId: user.id,
                email: rsaDecrypt(user.email)
            });
            const refreshToken = JWTUtils.generateRefreshToken({
                userId: user.id,
                email: rsaDecrypt(user.email)
            });

            return {
                status: true,
                message: 'Login successful',
                data: {
                    user: decryptedUser,
                    accessToken,
                    refreshToken
                }
            };
        } catch (error) {
            logger.error(`Login verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                status: false,
                message: 'Login verification failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async handleCardLogin(fileBuffer: Buffer): Promise<AuthResponse> {
        try {
            const extractedEncrypted = await extractEMD(fileBuffer);
            if (!extractedEncrypted) {
                throw new InvalidCardDataError('Failed to extract data from card image');
            }

            const payloadJson = superDecrypt(extractedEncrypted);
            if (!payloadJson) {
                throw new InvalidCardDataError('Failed to decrypt payload');
            }

            let payload: any;
            try {
                payload = JSON.parse(payloadJson);
            } catch (parseError) {
                logger.info(parseError);
                throw new InvalidCardDataError('Invalid payload format');
            }

            const verified = JWTUtils.verifyCardToken(payload.token);
            if (!verified || !verified.userId) {
                throw new InvalidTokenError('Invalid card token');
            }

            const user = await prisma.user.findUnique({
                where: {
                    id: verified.userId
                }
            });

            if (!user) {
                throw new UserNotFoundError('User not found');
            }

            const decryptedEmail = rsaDecrypt(user.email);

            const accessToken = JWTUtils.generateAccessToken({
                userId: user.id,
                email: decryptedEmail,
            });

            const refreshToken = JWTUtils.generateRefreshToken({
                userId: user.id,
                email: decryptedEmail
            });

            const decryptedUser = this.decryptUserData(user);

            logger.info(`Card login successful for user ID: ${user.id}`);
            return {
                status: true,
                message: 'Login by card successful',
                data: {
                    user: decryptedUser,
                    accessToken,
                    refreshToken
                }
            };

        } catch (error) {
            logger.error(`Card login error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error; 
        }
    }

}
