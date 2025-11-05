"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScryptUtils = void 0;
const crypto_1 = require("crypto");
const util_1 = require("util");
const scryptAsync = (0, util_1.promisify)(crypto_1.scrypt);
class ScryptUtils {
    /**
     * Hash a password using scrypt
     * @param password The password to hash
     * @returns Promise<string> The hashed password in format: salt.hash
     */
    static async hashPassword(password) {
        try {
            // Generate a random salt
            const salt = (0, crypto_1.randomBytes)(this.saltLength);
            // Hash the password
            const derivedKey = await scryptAsync(password, salt, this.keyLength);
            // Combine salt and hash with a delimiter
            return `${salt.toString('base64')}.${derivedKey.toString('base64')}`;
        }
        catch (error) {
            throw new Error('Error hashing password');
        }
    }
    /**
     * Verify a password against a stored hash
     * @param password The password to verify
     * @param storedHash The stored hash in format: salt.hash
     * @returns Promise<boolean> True if password matches, false otherwise
     */
    static async verifyPassword(password, storedHash) {
        try {
            // Split the stored hash into salt and hash components
            const [saltString, hashString] = storedHash.split('.');
            if (!saltString || !hashString) {
                return false;
            }
            // Convert base64 strings back to buffers
            const salt = Buffer.from(saltString, 'base64');
            const storedHashBuffer = Buffer.from(hashString, 'base64');
            // Hash the input password with the stored salt
            const derivedKey = await scryptAsync(password, salt, this.keyLength);
            // Compare the derived key with the stored hash
            return Buffer.compare(derivedKey, storedHashBuffer) === 0;
        }
        catch (error) {
            return false;
        }
    }
}
exports.ScryptUtils = ScryptUtils;
ScryptUtils.keyLength = 64;
ScryptUtils.saltLength = 32;
