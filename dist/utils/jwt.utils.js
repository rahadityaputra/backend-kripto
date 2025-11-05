"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class JWTUtils {
    static generateAccessToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.JWT_SECRET, { expiresIn: this.ACCESS_TOKEN_EXPIRY });
    }
    static generateRefreshToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.JWT_REFRESH_SECRET, { expiresIn: this.REFRESH_TOKEN_EXPIRY });
    }
    static verifyAccessToken(token) {
        return jsonwebtoken_1.default.verify(token, this.JWT_SECRET);
    }
    static verifyRefreshToken(token) {
        return jsonwebtoken_1.default.verify(token, this.JWT_REFRESH_SECRET);
    }
    static generateCardToken(userId, ttlSeconds = 60 * 60 * 24) {
        const payload = { userId };
        return jsonwebtoken_1.default.sign(payload, this.JWT_SECRET, { expiresIn: ttlSeconds });
    }
    static verifyCardToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, this.JWT_SECRET);
        }
        catch (e) {
            return null;
        }
    }
}
JWTUtils.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-here';
JWTUtils.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-here';
JWTUtils.ACCESS_TOKEN_EXPIRY = '1m';
JWTUtils.REFRESH_TOKEN_EXPIRY = '5m';
exports.default = JWTUtils;
