"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AESUtils = void 0;
const crypto_1 = __importDefault(require("crypto"));
const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
class AESUtils {
    static encryptBuffer(buffer, key) {
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const cipher = crypto_1.default.createCipheriv(ALGO, key, iv);
        const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return Buffer.concat([iv, authTag, encrypted]);
    }
    static decryptBuffer(encryptedBuffer, key) {
        const iv = encryptedBuffer.subarray(0, IV_LENGTH);
        const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + 16);
        const data = encryptedBuffer.subarray(IV_LENGTH + 16);
        const decipher = crypto_1.default.createDecipheriv(ALGO, key, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
        return decrypted;
    }
}
exports.AESUtils = AESUtils;
