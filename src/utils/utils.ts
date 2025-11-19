import { AESUtils } from "./aes.utils";
import CanvasUtils from "./canvas,utils";
import JWTUtils from "./jwt.utils";
// import { embedLSB } from "./stego.utils";
import { embedEMD } from "./stego2.utils";
import { superEncrypt } from "./superEncryption.utils";

export const createEncryptedPayload = (userId: number ) => {
    const cardToken = JWTUtils.generateCardToken(userId, 60 * 60 * 24 * 7);
    const payload = JSON.stringify({ userId, token: cardToken, iat: Date.now() });
    const encryptedPayload = superEncrypt(payload);
    return encryptedPayload;
}

export const createMemberCardBuffer = async (userId: number, userName: string) => {
    const fileMembershipCardBuffer = await CanvasUtils.createMemberCard({ memberId: userId.toString(), memberName: userName });
    return fileMembershipCardBuffer;
}

export const createEncryptedMemberCardStegoBuffer = async (fileMembershipCardBuffer: Buffer, payload: Buffer) => {
    const stegoBuffer = await embedEMD(fileMembershipCardBuffer, payload);
    const stegoBufferEncryped = encryptFile(stegoBuffer);
    return stegoBufferEncryped
}

export const encryptFile = (buffer: Buffer) => {
    const key = Buffer.from(process.env.AES_KEY!, "base64");
    const bufferEncryped = AESUtils.encryptBuffer(buffer, key);
    return bufferEncryped;
}

export const decryptFile = (encryptedBuffer: Buffer) => {
    const key = Buffer.from(process.env.AES_KEY!, "base64");
    const buffer = AESUtils.decryptBuffer(encryptedBuffer, key);
    return buffer;
}