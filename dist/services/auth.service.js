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
exports.AuthService = void 0;
const client_1 = require("@prisma/client");
const scrypt_utils_1 = require("../utils/scrypt.utils");
const jwt_utils_1 = __importDefault(require("../utils/jwt.utils"));
const logger_config_1 = require("../config/logger.config");
const rsa_utils_1 = require("../utils/rsa.utils");
const avatar_utils_1 = __importDefault(require("../utils/avatar.utils"));
const supabase_service_1 = require("./supabase.service");
const prisma = new client_1.PrismaClient();
// In-memory storage for verification codes
const verificationCodes = new Map();
// Define encrypted fields as an array instead of readonly tuple
const ENCRYPTED_FIELDS = ['email', 'username'];
class AuthService {
    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
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
    async register(userData) {
        try {
            logger_config_1.logger.info('Registering user with data: ' + JSON.stringify(userData));
            const allUsers = await prisma.user.findMany({
                select: { id: true, email: true }
            });
            const existingUser = allUsers.find(user => {
                try {
                    return (0, rsa_utils_1.rsaDecrypt)(user.email) === userData.email;
                }
                catch (_a) {
                    return false;
                }
            });
            if (existingUser) {
                logger_config_1.logger.warn(`Registration attempt with existing email: ${userData.email}`);
                return {
                    status: false,
                    message: 'Email already registered'
                };
            }
            const hashedPassword = await scrypt_utils_1.ScryptUtils.hashPassword(userData.password);
            // Encrypt sensitive fields using explicit type
            console.log('Encrypting user data for registration', userData);
            const encryptedData = (0, rsa_utils_1.rsaEncryptFields)(userData, ENCRYPTED_FIELDS);
            console.log('Encrypted user data for registration', encryptedData);
            const fullname_encrypted = (0, rsa_utils_1.rsaEncrypt)(userData.fullname);
            console.log('Encrypted fullname:', fullname_encrypted);
            const dateOfBirth_encrypted = (0, rsa_utils_1.rsaEncrypt)(userData.dateOfBirth);
            console.log('Encrypted dateOfBirth:', dateOfBirth_encrypted);
            const address_encrypted = (0, rsa_utils_1.rsaEncrypt)(userData.address);
            console.log('Encrypted address:', address_encrypted);
            const avatarBuffer = await avatar_utils_1.default.generateAvatarImageFile(userData.fullname);
            const user = await prisma.user.create({
                data: {
                    email: encryptedData.email,
                    username: encryptedData.username,
                    password: hashedPassword,
                    role: userData.role || 'user',
                    emailVerified: true
                    // emailVerified: false
                }
            });
            const profileAvatarUrl = await supabase_service_1.SupabaseStorageService.uploadAvatarImage(avatarBuffer, `${user.id}_avatar.png`);
            await prisma.profile.create({
                data: {
                    userId: user.id,
                    fullname: fullname_encrypted,
                    birthDate: dateOfBirth_encrypted,
                    address: address_encrypted,
                    gender: userData.gender,
                    avatarUrl: profileAvatarUrl
                }
            });
            const decryptedUser = this.decryptUserData(user);
            const accessToken = jwt_utils_1.default.generateAccessToken({
                userId: user.id,
                email: (0, rsa_utils_1.rsaDecrypt)(user.email),
                role: user.role
            });
            const refreshToken = jwt_utils_1.default.generateRefreshToken({
                userId: user.id,
                email: (0, rsa_utils_1.rsaDecrypt)(user.email),
                role: user.role
            });
            logger_config_1.logger.info(`User registered successfully with ID: ${user.id}`);
            return {
                status: true,
                message: 'Registration successful.',
                data: {
                    user: decryptedUser,
                    accessToken,
                    refreshToken
                }
            };
        }
        catch (error) {
            logger_config_1.logger.error(`Registration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                status: false,
                message: 'Registration failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async verifyEmail(userId, code) {
        try {
            const storedCode = verificationCodes.get(userId);
            if (!storedCode) {
                logger_config_1.logger.warn(`Verification attempt with no stored code for user ID: ${userId}`);
                return {
                    status: false,
                    message: 'Verification code not found'
                };
            }
            if (storedCode !== code) {
                logger_config_1.logger.warn(`Invalid verification code used for user ID: ${userId}`);
                return {
                    status: false,
                    message: 'Invalid verification code'
                };
            }
            const user = await prisma.user.update({
                where: { id: userId },
                data: { emailVerified: true }
            });
            verificationCodes.delete(userId);
            logger_config_1.logger.info(`Email verified successfully for user ID: ${userId}`);
            const decryptedUser = this.decryptUserData(user);
            const accessToken = jwt_utils_1.default.generateAccessToken({
                userId: user.id,
                email: (0, rsa_utils_1.rsaDecrypt)(user.email),
                role: user.role
            });
            const refreshToken = jwt_utils_1.default.generateRefreshToken({
                userId: user.id,
                email: (0, rsa_utils_1.rsaDecrypt)(user.email),
                role: user.role
            });
            return {
                status: true,
                message: 'Email verified successfully',
                data: {
                    user: decryptedUser,
                    accessToken,
                    refreshToken
                }
            };
        }
        catch (error) {
            logger_config_1.logger.error(`Email verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                status: false,
                message: 'Email verification failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async login(loginData) {
        try {
            // Find user by encrypted email
            const allUsers = await prisma.user.findMany();
            const user = allUsers.find(u => {
                try {
                    return (0, rsa_utils_1.rsaDecrypt)(u.email) === loginData.email;
                }
                catch (_a) {
                    return false;
                }
            });
            if (!user) {
                logger_config_1.logger.warn(`Login attempt with non-existent email: ${loginData.email}`);
                return {
                    status: false,
                    message: 'Invalid email or password'
                };
            }
            const validPassword = await scrypt_utils_1.ScryptUtils.verifyPassword(loginData.password, user.password);
            if (!validPassword) {
                logger_config_1.logger.warn(`Failed login attempt for user ID: ${user.id}`);
                return {
                    status: false,
                    message: 'Invalid email or password'
                };
            }
            if (!user.emailVerified) {
                logger_config_1.logger.warn(`Login attempt with unverified email: ${loginData.email}`);
                return {
                    status: false,
                    message: 'Email not verified'
                };
            }
            const decryptedUser = this.decryptUserData(user);
            const accessToken = jwt_utils_1.default.generateAccessToken({
                userId: user.id,
                email: (0, rsa_utils_1.rsaDecrypt)(user.email),
                role: user.role
            });
            const refreshToken = jwt_utils_1.default.generateRefreshToken({
                userId: user.id,
                email: (0, rsa_utils_1.rsaDecrypt)(user.email),
                role: user.role
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
        }
        catch (error) {
            logger_config_1.logger.error(`Login error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                status: false,
                message: 'Login failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    decryptUserData(user) {
        const decryptedUser = (0, rsa_utils_1.rsaDecryptFields)(user, ENCRYPTED_FIELDS);
        const { password } = decryptedUser, userWithoutPassword = __rest(decryptedUser, ["password"]);
        return userWithoutPassword;
    }
    async verifyLogin(userId, code) {
        try {
            const storedCode = verificationCodes.get(userId);
            if (!storedCode) {
                logger_config_1.logger.warn(`Login verification attempt with no stored code for user ID: ${userId}`);
                return {
                    status: false,
                    message: 'Verification code not found'
                };
            }
            if (storedCode !== code) {
                logger_config_1.logger.warn(`Invalid login verification code used for user ID: ${userId}`);
                return {
                    status: false,
                    message: 'Invalid verification code'
                };
            }
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });
            if (!user) {
                logger_config_1.logger.error(`User not found during login verification for ID: ${userId}`);
                return {
                    status: false,
                    message: 'User not found'
                };
            }
            verificationCodes.delete(userId);
            logger_config_1.logger.info(`Login verified successfully for user ID: ${userId}`);
            const decryptedUser = this.decryptUserData(user);
            const accessToken = jwt_utils_1.default.generateAccessToken({
                userId: user.id,
                email: (0, rsa_utils_1.rsaDecrypt)(user.email),
                role: user.role
            });
            const refreshToken = jwt_utils_1.default.generateRefreshToken({
                userId: user.id,
                email: (0, rsa_utils_1.rsaDecrypt)(user.email),
                role: user.role
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
        }
        catch (error) {
            logger_config_1.logger.error(`Login verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                status: false,
                message: 'Login verification failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
exports.AuthService = AuthService;
