"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const logger_config_1 = require("../config/logger.config");
class AvatarUtils {
    static async generateAvatarImageFile(fullname) {
        try {
            const avatarUrl = `https://api.dicebear.com/9.x/initials/svg?seed=${fullname}&backgroundColor=00897b,039be5,1e88e5,3949ab,43a047,5e35b1,7cb342,8e24aa,c0ca33,d81b60,e53935,f4511e,fb8c00,fdd835,ffb300&fontFamily=Arial`;
            const avatar = await axios_1.default.get(avatarUrl, { responseType: 'arraybuffer' });
            const avatarBuffer = Buffer.from(avatar.data, 'binary');
            return avatarBuffer;
        }
        catch (error) {
            logger_config_1.logger.error(`Generate avatar image error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
}
exports.default = AvatarUtils;
