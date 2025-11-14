import { createHash, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export class ScryptUtils {
    private static readonly keyLength = 64;
    private static readonly saltLength = 32;

    static async hashPassword(password: string): Promise<string> {
        try {
            const salt = randomBytes(this.saltLength);
            const derivedKey = await scryptAsync(password, salt, this.keyLength) as Buffer;
            return `${salt.toString('base64')}.${derivedKey.toString('base64')}`;
        } catch (error) {
            throw new Error('Error hashing password');
        }
    }

    static async verifyPassword(password: string, storedHash: string): Promise<boolean> {
        try {
            const [saltString, hashString] = storedHash.split('.');
            if (!saltString || !hashString) {
                return false;
            }
            const salt = Buffer.from(saltString, 'base64');
            const storedHashBuffer = Buffer.from(hashString, 'base64');

            const derivedKey = await scryptAsync(password, salt, this.keyLength) as Buffer;

            return Buffer.compare(derivedKey, storedHashBuffer) === 0;
        } catch (error) {
            return false;
        }
    }
}