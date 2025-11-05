declare module 'chacha20' {
    export class ChaCha20 {
        constructor(key: Buffer, nonce: Buffer);
        encrypt(data: Buffer): Buffer;
        decrypt(data: Buffer): Buffer;
    }
}