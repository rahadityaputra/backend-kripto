"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const auth_service_1 = require("../services/auth.service");
const logger_config_1 = require("../config/logger.config");
const supabase_service_1 = require("../services/supabase.service");
const canvas_utils_1 = __importDefault(require("../utils/canvas,utils"));
const user_service_1 = require("../services/user.service");
const superEncryption_utils_1 = require("../utils/superEncryption.utils");
const jwt_utils_1 = __importDefault(require("../utils/jwt.utils"));
const stego_utils_1 = require("../utils/stego.utils");
const aes_utils_1 = require("../utils/aes.utils");
class UserController {
    constructor() {
        this.authService = new auth_service_1.AuthService();
        this.userService = new user_service_1.UserService();
    }
    async verifyToken(req, res) {
        try {
            const result = {
                status: true,
                message: 'Token is valid'
            };
            return res.status(result.status ? 200 : 400).json(result);
        }
        catch (error) {
            logger_config_1.logger.error(`Registration controller error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async verifyEmail(req, res) {
        try {
            const { userId, code } = req.body;
            logger_config_1.logger.info(`Email verification request received for user ID: ${userId}`);
            const result = await this.authService.verifyEmail(userId, code);
            return res.status(result.status ? 200 : 400).json(result);
        }
        catch (error) {
            logger_config_1.logger.error(`Email verification controller error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async login(req, res) {
        try {
            const loginData = req.body;
            logger_config_1.logger.info(`Login request received for email: ${loginData.email}`);
            const result = await this.authService.login(loginData);
            return res.status(result.status ? 200 : 401).json(result);
        }
        catch (error) {
            logger_config_1.logger.error(`Login controller error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async verifyLogin(req, res) {
        try {
            const { userId, code } = req.body;
            logger_config_1.logger.info(`Login verification request received for user ID: ${userId}`);
            const result = await this.authService.verifyLogin(userId, code);
            return res.status(result.status ? 200 : 400).json(result);
        }
        catch (error) {
            logger_config_1.logger.error(`Login verification controller error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async uploadIdentityCard(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
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
            logger_config_1.logger.info(`Processing identity card upload for user ID: ${userId}`);
            const cardToken = jwt_utils_1.default.generateCardToken(userId, 60 * 60 * 24 * 7);
            const payload = JSON.stringify({ userId, token: cardToken, iat: Date.now() });
            const encrypted = (0, superEncryption_utils_1.superEncrypt)(payload);
            const identityBuffer = file.buffer;
            const fullname = await this.userService.getUserFullName(userId);
            const fileMembershipCardBuffer = await canvas_utils_1.default.createMemberCard({ memberId: userId.toString(), memberName: fullname });
            const stegoBuffer = await (0, stego_utils_1.embedLSB)(fileMembershipCardBuffer, encrypted);
            const key = Buffer.from(process.env.AES_KEY, "base64");
            const encryptedIdentityCardBuffer = aes_utils_1.AESUtils.encryptBuffer(identityBuffer, key);
            const imageUrl = await supabase_service_1.SupabaseStorageService.uploadEncryptedImage(encryptedIdentityCardBuffer, userId);
            const filename = `stegano-membership-card.png`;
            const steganoUrl = await supabase_service_1.SupabaseStorageService.uploadBufferAsImage(stegoBuffer, userId.toString(), filename);
            const membershipCardUrl = await supabase_service_1.SupabaseStorageService.uploadBufferAsImage(fileMembershipCardBuffer, userId.toString(), 'original-membership-card.png');
            if (!imageUrl) {
                logger_config_1.logger.error(`Failed to upload identity card for user ID: ${userId}`);
                return res.status(500).json({
                    status: false,
                    message: 'Failed to upload identity card'
                });
            }
            const memberUser = await this.userService.setMemberUser(userId);
            await this.userService.updateMembershipCardUrl(userId, membershipCardUrl);
            logger_config_1.logger.info(`Successfully uploaded identity card for user ID: ${userId}`);
            return res.status(200).json({
                data: Object.assign({ membershipCardUrl: steganoUrl }, memberUser),
                status: true,
                message: 'Identity card uploaded successfully'
            });
        }
        catch (error) {
            console.log(error);
            logger_config_1.logger.error(`Identity card upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    async getUserProfile(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({
                    status: false,
                    message: 'Unauthorized'
                });
            }
            logger_config_1.logger.info(`Fetching user profile for user ID: ${userId}`);
            const result = await this.userService.getUserProfile(userId);
            return res.status(result.status ? 200 : 400).json(result);
        }
        catch (error) {
            logger_config_1.logger.error(`Get user profile controller error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async updateProfileData(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({
                    status: false,
                    message: 'Unauthorized'
                });
            }
            const profileData = req.body;
            const file = req.file;
            const avatarUploadBuffer = file === null || file === void 0 ? void 0 : file.buffer;
            logger_config_1.logger.info(`Updating profile data for user ID: ${userId}`);
            const result = await this.userService.updateProfileData(userId, profileData, avatarUploadBuffer);
            return res.status(result.status ? 200 : 400).json(result);
        }
        catch (error) {
            logger_config_1.logger.error(`Update profile data controller error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async downloadMembershipCard(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId; // pastikan JWT middleware sudah set req.user
            if (!userId) {
                return res.status(401).json({
                    status: false,
                    message: "Unauthorized",
                });
            }
            // path penyimpanan membership card (harus sama dengan upload)
            const filename = `${userId}/stegano-membership-card.png`;
            const fileBlob = await supabase_service_1.SupabaseStorageService.downloadFile(filename);
            const arrayBuffer = await fileBlob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            res.setHeader("Content-Type", "image/png");
            res.setHeader("Content-Disposition", `attachment; filename=membership-card-${userId}.png`);
            return res.send(buffer);
        }
        catch (error) {
            console.log(error);
            return res.status(500).json({
                status: false,
                message: "Failed to download membership card",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
}
exports.UserController = UserController;
