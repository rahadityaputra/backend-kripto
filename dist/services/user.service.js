"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const client_1 = require("@prisma/client");
const rsa_utils_1 = require("../utils/rsa.utils");
const jwt_utils_1 = __importDefault(require("../utils/jwt.utils"));
const logger_config_1 = require("../config/logger.config");
const supabase_service_1 = require("./supabase.service");
const prisma = new client_1.PrismaClient();
;
const ENCRYPTED_FIELDS = ['email', 'username'];
const PROFILE_ENCRYPTED_FIELDS = [
    "fullname",
    "address",
    "gender",
    "dateOfBirth",
    "avatarUrl"
];
class UserService {
    async setMemberUser(userId) {
        try {
            const user = await prisma.user.update({
                where: { id: userId },
                data: { isMemberUser: true }
            });
            if (!user) {
                logger_config_1.logger.warn(`Failed to set member user for user ID: ${userId}`);
                throw new Error('User not found');
            }
            const decryptedUser = this.decryptUserData(user);
            logger_config_1.logger.info(`Successfully set member user for user ID: ${userId}`);
            return user;
        }
        catch (error) {
            logger_config_1.logger.error(`Set member user error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            // return {
            //     status: false,
            //     message: 'Failed to set member user',
            //     error: error instanceof Error ? error.message : 'Unknown error'
            // };
            throw error;
        }
    }
    async verifyRefreshToken(refreshToken) {
        try {
            const decoded = jwt_utils_1.default.verifyRefreshToken(refreshToken);
            const accessToken = jwt_utils_1.default.generateAccessToken({
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role
            });
            const newRefreshToken = jwt_utils_1.default.generateRefreshToken({
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
        }
        catch (error) {
            logger_config_1.logger.error(`Refresh token verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                status: false,
                message: 'Invalid refresh token',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    decryptUserData(user) {
        const decryptedUser = (0, rsa_utils_1.rsaDecryptFields)(user, ENCRYPTED_FIELDS);
        const { password } = decryptedUser, userWithoutPassword = __rest(decryptedUser, ["password"]);
        return userWithoutPassword;
    }
    decryptProfileData(profile) {
        if (!profile)
            return profile;
        // Dekripsi field-field sensitif
        const decryptedProfile = (0, rsa_utils_1.rsaDecryptFields)(profile, PROFILE_ENCRYPTED_FIELDS);
        return decryptedProfile;
    }
    async getUserProfile(userId) {
        try {
            const profileUser = await prisma.profile.findUnique({
                where: { userId: userId }
            });
            const isMemberUser = await this.isMemberUser(userId);
            if (!profileUser) {
                logger_config_1.logger.warn(`User not found for User ID: ${userId}`);
                throw new Error('User not found');
            }
            logger_config_1.logger.info("fullname encrypted: " + (profileUser === null || profileUser === void 0 ? void 0 : profileUser.fullname));
            logger_config_1.logger.info("address encrypted: " + (profileUser === null || profileUser === void 0 ? void 0 : profileUser.address));
            logger_config_1.logger.info("gender encrypted   : " + (profileUser === null || profileUser === void 0 ? void 0 : profileUser.gender));
            const decryptedUserProfile = {
                fullname: (0, rsa_utils_1.rsaDecrypt)((profileUser === null || profileUser === void 0 ? void 0 : profileUser.fullname) || ''),
                address: (0, rsa_utils_1.rsaDecrypt)((profileUser === null || profileUser === void 0 ? void 0 : profileUser.address) || ''),
                birthDate: (0, rsa_utils_1.rsaDecrypt)((profileUser === null || profileUser === void 0 ? void 0 : profileUser.birthDate) || ''),
            };
            logger_config_1.logger.info(`Successfully decrypted profile for User ID: ${userId}`);
            logger_config_1.logger.info(decryptedUserProfile);
            const data = Object.assign(Object.assign({}, decryptedUserProfile), { isMemberUser });
            if (isMemberUser) {
                const memberUser = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { membershipCardUrl: true }
                });
                const membershipCardURL = (memberUser === null || memberUser === void 0 ? void 0 : memberUser.membershipCardUrl) || null;
                Object.assign(data, { membershipCardURL });
            }
            return {
                status: true,
                message: 'User profile retrieved successfully',
                data
            };
        }
        catch (error) {
            logger_config_1.logger.error(`Get profile error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                status: false,
                message: 'Failed to retrieve User profile',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async isMemberUser(userId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { isMemberUser: true }
            });
            if (!user) {
                logger_config_1.logger.warn(`User not found for User ID: ${userId}`);
                throw new Error('User not found');
            }
            logger_config_1.logger.info(`isMemberUser for User ID ${userId}: ${user.isMemberUser}`);
            return user.isMemberUser;
        }
        catch (error) {
            logger_config_1.logger.error(`isMemberUser check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
    async getUserFullName(userId) {
        try {
            const profileUser = await prisma.profile.findUnique({
                where: { userId: userId },
                select: { fullname: true }
            });
            if (!profileUser) {
                logger_config_1.logger.warn(`Profile not found for User ID: ${userId}`);
                throw new Error('Profile not found');
            }
            const decryptedFullName = (0, rsa_utils_1.rsaDecrypt)(profileUser.fullname || '');
            logger_config_1.logger.info(`Successfully retrieved and decrypted fullname for User ID: ${userId}`);
            return decryptedFullName;
        }
        catch (error) {
            logger_config_1.logger.error(`Get user fullname error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
    async updateMembershipCardUrl(userId, url) {
        try {
            await prisma.user.update({
                where: { id: userId },
                data: { membershipCardUrl: url }
            });
            logger_config_1.logger.info(`Successfully updated membership card URL for User ID: ${userId}`);
        }
        catch (error) {
            logger_config_1.logger.error(`Update membership card URL error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
    async updateProfileData(userId, profileData, avatarFile) {
        try {
            // Encrypt sensitive fields before updating
            if (avatarFile) {
                const avatarUrl = await supabase_service_1.SupabaseStorageService.uploadAvatarImage(avatarFile, `${userId}-avatar.png`);
                profileData = Object.assign(Object.assign({}, profileData), { avatarUrl });
            }
            const encryptedData = Object.assign({}, profileData);
            for (const field of PROFILE_ENCRYPTED_FIELDS) {
                if (profileData[field]) {
                    encryptedData[field] = (0, rsa_utils_1.rsaEncrypt)(profileData[field]);
                }
            }
            logger_config_1.logger.info("encryptedData", encryptedData);
            const data = await prisma.profile.update({
                where: { userId: userId },
                data: encryptedData
            });
            logger_config_1.logger.info(`Successfully updated profile data for User ID: ${userId}`);
            return {
                status: true,
                message: 'Update usee profile successfully',
                data
            };
        }
        catch (error) {
            logger_config_1.logger.error(`Update profile data error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
}
exports.UserService = UserService;
