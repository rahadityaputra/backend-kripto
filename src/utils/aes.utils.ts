import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

export class AESUtils {
  static encryptBuffer(buffer: Buffer, key: Buffer) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGO, key, iv);

    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]); 
  }

  static decryptBuffer(encryptedBuffer: Buffer, key: Buffer) {
    const iv = encryptedBuffer.subarray(0, IV_LENGTH);
    const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + 16);
    const data = encryptedBuffer.subarray(IV_LENGTH + 16);

    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted;
  }
}
